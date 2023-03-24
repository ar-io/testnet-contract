import {
  DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  DEFAULT_INVALID_YEARS_MESSAGE,
  MAX_YEARS,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { calculateAnnualRenewalFee } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

// Increases the lease time for an existing record
export const extendRecord = async (
  state: IOState,
  { caller, input: { name, years } }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const currentBlockTime = +SmartWeave.block.timestamp;
  const allTiers = state.tiers.history;

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
  if (!records[name]) {
    throw new ContractError(DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  // Check if it includes a valid number of years
  if (!Number.isInteger(years) || years > MAX_YEARS) {
    throw new ContractError(DEFAULT_INVALID_YEARS_MESSAGE);
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

  const purchasedTier = allTiers.find((t) => t.id === records[name].tier);

  // total cost to extend a record for the given tier
  const totalExtensionAnnualFee = calculateAnnualRenewalFee(
    name,
    state,
    purchasedTier,
    years,
  );

  if (balances[caller] < totalExtensionAnnualFee) {
    throw new ContractError(
      `Caller balance not high enough to extend this name lease for ${totalExtensionAnnualFee} token(s) for ${years}!`,
    );
  }

  // reduce balance set the end lease period for this record based on number of years
  balances[caller] -= totalExtensionAnnualFee; // reduce callers balance
  records[name].endTimestamp += SECONDS_IN_A_YEAR * years; // set the new extended timestamp

  return { state };
};
