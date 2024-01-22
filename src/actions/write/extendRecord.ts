import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  FEES,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_NAME_EXTENSION_TYPE_MESSAGE,
  INVALID_YEARS_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { calculateAnnualRenewalFee, tallyNamePurchase } from '../../pricing';
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
  getMaxAllowedYearsExtensionForRecord,
  isExistingActiveRecord,
  isLeaseRecord,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateExtendRecord } from '../../validations';

export class ExtendRecord {
  function = 'extendRecord';
  name: string;
  years: number;

  constructor(input: unknown) {
    if (!validateExtendRecord(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateExtendRecord, input, 'extendRecord'),
      );
    }
    const { name, years } = input as ExtendRecord;
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
  const { balances, records } = state;
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
    throw new ContractError(INVALID_NAME_EXTENSION_TYPE_MESSAGE);
  }

  assertRecordCanBeExtended({
    record,
    currentBlockTimestamp,
    years,
  });

  const demandFactor = state.demandFactoring.demandFactor;
  const totalExtensionAnnualFee =
    demandFactor *
    calculateAnnualRenewalFee({
      name,
      fees: FEES,
      years,
    });

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
    throw new ContractError(INVALID_NAME_EXTENSION_TYPE_MESSAGE);
  }

  if (
    years >
    getMaxAllowedYearsExtensionForRecord({ currentBlockTimestamp, record })
  ) {
    throw new ContractError(INVALID_YEARS_MESSAGE);
  }
}
