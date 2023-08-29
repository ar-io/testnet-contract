import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INVALID_YEARS_MESSAGE,
  MAX_YEARS,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateAnnualRenewalFee,
  walletHasSufficientBalance,
} from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

// Increases the lease time for an existing record
export const extendRecord = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { balances, records, fees } = state;
  const currentBlockTime = +SmartWeave.block.timestamp;

  // TODO: object parse validation
  const { name, years } = input as any;

  // get the record
  const record = records[name];

  // Check if the user has enough tokens to purchase the name
  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  // check if record exists
  if (!record) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  // Check if it includes a valid number of years
  if (!Number.isInteger(years) || years > MAX_YEARS) {
    throw new ContractError(INVALID_YEARS_MESSAGE);
  }

  /**
   * Scenarios:
   * 1. Name is not yet in grace period (i.e. still active)
   * 2. Name is expired, but beyond grace period
   * 3. Name is in grace period and can be extended by anyone
   */
  if (records[name].endTimestamp > currentBlockTime) {
    // name is not yet in a grace period
    throw new ContractError(
      `This name cannot be extended until the grace period begins.`,
    );
  }

  if (
    records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <=
    currentBlockTime
  ) {
    // This name's lease has expired and cannot be extended
    throw new ContractError(
      `This name has expired and must repurchased before it can be extended.`,
    );
  }

  // total cost to extend a record
  const totalExtensionAnnualFee = calculateAnnualRenewalFee(
    name,
    fees,
    years,
    record.undernames,
    record.endTimestamp,
  );

  if (!walletHasSufficientBalance(balances, caller, totalExtensionAnnualFee)) {
    throw new ContractError(
      `Caller balance not high enough to extend this name lease for ${totalExtensionAnnualFee} token(s) for ${years}!`,
    );
  }

  // reduce balance set the end lease period for this record based on number of years
  balances[caller] -= totalExtensionAnnualFee; // reduce callers balance
  state.balances[caller] -= totalExtensionAnnualFee; // reduce callers balance
  state.records[name].endTimestamp += SECONDS_IN_A_YEAR * years; // set the new extended timestamp
  return { state };
};
