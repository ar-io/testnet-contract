import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_NAME_EXTENSION_TYPE_MESSAGE,
  INVALID_YEARS_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { calculateAnnualRenewalFee, tallyNamePurchase } from '../../pricing';
import {
  BlockTimestamp,
  ContractWriteResult,
  IOState,
  PstAction,
} from '../../types';
import {
  getInvalidAjvMessage,
  getMaxAllowedYearsExtensionForRecord,
  isExistingActiveRecord,
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

  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  // This name's lease has expired and cannot be extended
  if (
    !isExistingActiveRecord({
      record,
      currentBlockTimestamp,
    })
  ) {
    if (!record) {
      throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
    }
    if (record.type === 'permabuy') {
      throw new ContractError(INVALID_NAME_EXTENSION_TYPE_MESSAGE);
    }
    throw new ContractError(
      `This name has expired and must renewed before its undername support can be extended.`,
    );
  }

  if (
    years >
    getMaxAllowedYearsExtensionForRecord({ currentBlockTimestamp, record })
  ) {
    throw new ContractError(INVALID_YEARS_MESSAGE);
  }

  const demandFactor = state.demandFactoring.demandFactor;
  const totalExtensionAnnualFee =
    demandFactor *
    calculateAnnualRenewalFee({
      name,
      fees,
      years,
      undernames: record.undernames,
      endTimestamp: new BlockTimestamp(record.endTimestamp),
    });

  if (!walletHasSufficientBalance(balances, caller, totalExtensionAnnualFee)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  state.balances[caller] -= totalExtensionAnnualFee;
  state.balances[SmartWeave.contract.id] += totalExtensionAnnualFee;
  state.records[name].endTimestamp += SECONDS_IN_A_YEAR * years;
  state.demandFactoring = tallyNamePurchase(state.demandFactoring);

  return { state };
};
