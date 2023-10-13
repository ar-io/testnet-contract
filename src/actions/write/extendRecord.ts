import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_NAME_EXTENSION_TYPE_MESSAGE,
  INVALID_YEARS_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { tallyNamePurchase } from '../../pricing';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateAnnualRenewalFee,
  getInvalidAjvMessage,
  getMaxLeaseExtension,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateExtendRecord } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export class ExtendRecord {
  function = 'extendRecord';
  name: string;
  years: number;

  constructor(input: any) {
    if (!validateExtendRecord(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateExtendRecord, input),
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
): Promise<ContractResult> => {
  const { balances, records, fees } = state;
  const currentBlockTime = +SmartWeave.block.timestamp;
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

  if (!record) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  if (!record.endTimestamp) {
    throw new ContractError(INVALID_NAME_EXTENSION_TYPE_MESSAGE);
  }

  if (getMaxLeaseExtension(currentBlockTime, record.endTimestamp) === 0) {
    throw new ContractError(INVALID_YEARS_MESSAGE);
  }

  // total cost to extend a record
  // TODO: Extract this to a separate fee calculation function for extensions
  const demandFactor = state.demandFactoring.demandFactor;
  const totalExtensionAnnualFee =
    demandFactor *
    calculateAnnualRenewalFee(
      name,
      fees,
      years,
      record.undernames,
      record.endTimestamp,
    );

  if (!walletHasSufficientBalance(balances, caller, totalExtensionAnnualFee)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  // TODO: implement protocol balance transfer for this charge.
  state.balances[caller] -= totalExtensionAnnualFee;
  state.balances[SmartWeave.contract.id] += totalExtensionAnnualFee;
  state.records[name].endTimestamp += SECONDS_IN_A_YEAR * years;
  state.demandFactoring = tallyNamePurchase(state.demandFactoring);

  return { state };
};
