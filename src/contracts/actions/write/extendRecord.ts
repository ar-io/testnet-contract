import {
  DEFAULT_ANNUAL_PERCENTAGE_FEE,
  DEFAULT_UNDERNAMES_COUNT,
  DEFAULT_UNDERNAME_REGISTRATION_IO_FEE,
  MAX_YEARS,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '@/constants';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;
declare const SmartWeave: any;

// Increases the lease time for an existing record
export const extendRecord = async (
  state: IOState,
  { caller, input: { name, years } }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const fees = state.fees;
  const currentBlockTime = +SmartWeave.block.timestamp;

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
    throw new ContractError(`No record exists with this name ${name}`);
  }

  // Check if it includes a valid number of years
  if (!Number.isInteger(years) || years > MAX_YEARS) {
    throw new ContractError(
      `Invalid value for "years". Must be an integers and less than ${MAX_YEARS}`,
    );
  }

  /**
   * Scenarios:
   * 1. Name is not yet in grace period (i.e expired)
   * 2. Name is expired, but beyond grace period
   * 3. Name is in grace period, can but extended
   */
  if (records[name].endTimestamp <= currentBlockTime) {
    // name is not yet in a grace period
    throw new ContractError(
      `This name's cannot be extended until the grace period begins.`,
    );
  }

  if (
    records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD >=
    currentBlockTime
  ) {
    // This name's lease has expired and cannot be extended
    throw new ContractError(
      `This name has expired and must repurchased before it can be extended.`,
    );
  }

  // annual cost of name
  const annualRegistrationFee =
    fees[name.length.toString()] * DEFAULT_ANNUAL_PERCENTAGE_FEE;

  // annual cost of undernames to extend
  const annualUndernameFee =
    (records[name].maxUndernames - DEFAULT_UNDERNAMES_COUNT) *
    DEFAULT_UNDERNAME_REGISTRATION_IO_FEE;

  // the cost to extend the name, and undernames for the allowed number of years
  const totalAnnualExtensionFee =
    (annualRegistrationFee + annualUndernameFee) * years;

  if (balances[caller] < totalAnnualExtensionFee) {
    throw new ContractError(
      `Caller balance not high enough to extend this name lease for ${totalAnnualExtensionFee} token(s) for ${years}!`,
    );
  }

  // reduce balance set the end lease period for this record based on number of years
  balances[caller] -= totalAnnualExtensionFee; // reduce callers balance
  records[name].endTimestamp += SECONDS_IN_A_YEAR * years; // set the new extended timestamp

  return { state };
};
