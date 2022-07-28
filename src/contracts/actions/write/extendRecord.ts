import {
  MAX_YEARS,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from "@/constants";
import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

export const extendRecord = async (
  state: ArNSState,
  { caller, input: { name, years } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const foundation = state.foundation;
  const fees = state.fees;
  const currentBlockTime = +SmartWeave.block.timestamp;

  // Check if the user has enough tokens to purchase the name
  if (!balances[caller]) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  // check if record exists
  if (!records[name]) {
    throw new ContractError(`No record exists with this name ${name}`);
  }

  // Check if it includes a valid number of years
  if (!Number.isInteger(years) || years > MAX_YEARS) {
    throw new ContractError(
      `Invalid value for "years". Must be an integers and less than ${MAX_YEARS}`
    );
  }

  // check if this is an active lease, if not it cannot be extended
  if (records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD < currentBlockTime) {
    // This name's lease has expired and cannot be extended
    throw new ContractError(
      `This name's lease has expired.  It must be purchased first before being extended.`
    );
  }

  // Determine price of extending this name, must take into consideration
  let qty = fees[name.length.toString()] * records[name].tier * years;

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to extend this name lease for ${qty} token(s) for ${years}!`
    );
  }

  // reduce balance set the end lease period for this record based on number of years
  balances[caller] -= qty; // reduce callers balance
  foundation.balance += qty; // increase foundation balance
  records[name].endTimestamp += SECONDS_IN_A_YEAR * years; // set the new extended timestamp

  return { state };
};
