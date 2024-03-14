import {
  ARNS_INVALID_EXTENSION_MESSAGE,
  ARNS_INVALID_YEARS_MESSAGE,
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { calculateAnnualRenewalFee, tallyNamePurchase } from '../../pricing';
import {
  getMaxAllowedYearsExtensionForRecord,
  isExistingActiveRecord,
  isLeaseRecord,
} from '../../records';
import { safeTransfer } from '../../transfer';
import {
  ArNSNameData,
  BlockTimestamp,
  ContractWriteResult,
  IOState,
  PstAction,
} from '../../types';
import {
  getInvalidAjvMessage,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateExtendRecord } from '../../validations';

export class ExtendRecord {
  function = 'extendRecord';
  name: string;
  years: number;

  constructor(input: any) {
    if (!validateExtendRecord(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateExtendRecord, input, 'extendRecord'),
      );
    }
    const { name, years } = input;
    this.name = name.trim().toLowerCase();
    this.years = years;
  }
}

/** Increases the lease time for an existing record
 * Scenarios:
 * 1. Name is not yet in grace period (i.e. still active)
 * 2. Name is expired, but beyond grace period
 * 3. Name is in grace period and can be extended by anyone
 * 4. Name is a permanent name and cannot be extended
 */

export const extendRecord = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, records, fees } = state;
  const currentBlockTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);
  const { name, years } = new ExtendRecord(input);
  const record = records[name];
  if (!record) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (!isLeaseRecord(record)) {
    throw new ContractError(ARNS_INVALID_EXTENSION_MESSAGE);
  }

  assertRecordCanBeExtended({
    record,
    currentBlockTimestamp,
    years,
  });

  const demandFactor = state.demandFactoring.demandFactor;
  const annualRenewalFee = calculateAnnualRenewalFee({
    name,
    fees,
    years,
  });

  const totalExtensionAnnualFee = annualRenewalFee.multiply(demandFactor);

  if (!walletHasSufficientBalance(balances, caller, totalExtensionAnnualFee)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  safeTransfer({
    balances: state.balances,
    fromAddress: caller,
    toAddress: SmartWeave.contract.id,
    qty: totalExtensionAnnualFee,
  });

  record.endTimestamp += SECONDS_IN_A_YEAR * years;
  state.demandFactoring = tallyNamePurchase(
    state.demandFactoring,
    totalExtensionAnnualFee,
  );

  return { state };
};

export function assertRecordCanBeExtended({
  record,
  currentBlockTimestamp,
  years,
}: {
  record: ArNSNameData;
  currentBlockTimestamp: BlockTimestamp;
  years: number;
}): void {
  // This name's lease has expired beyond grace period and cannot be extended
  if (
    !isExistingActiveRecord({
      record,
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(
      `This name has expired and must renewed before its undername support can be extended.`,
    );
  }

  if (!isLeaseRecord(record)) {
    throw new ContractError(ARNS_INVALID_EXTENSION_MESSAGE);
  }

  if (
    years >
    getMaxAllowedYearsExtensionForRecord({ currentBlockTimestamp, record })
  ) {
    throw new ContractError(ARNS_INVALID_YEARS_MESSAGE);
  }
}
