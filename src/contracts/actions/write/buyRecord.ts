import {
  MAX_NAME_LENGTH,
  MAX_YEARS,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  TX_ID_LENGTH,
  DEFAULT_TIERS
} from "@/constants";
import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

export const buyRecord = async (
  state: IOState,
  { caller, input: { name, contractTxId, years, tier } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const fees = state.fees;
  const tiers = state.tiers ?? DEFAULT_TIERS;
  // TODO: necessary for protocol p
  // const foundation = state.foundation;
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

  // Check if it includes a valid number of years
  if (!Number.isInteger(years) || years > MAX_YEARS || years <= 0) {
    throw new ContractError(
      'Invalid value for "years". Must be an integer greater than zero and less than the max years'
    );
  }

  // Check if it includes a valid tier
  if (!Number.isInteger(tier)) {
    throw new ContractError('Invalid value for "tier". Must be an integer');
  }

  // Check if this is a valid tier, if tier does not exist
  if (!tiers[tier]) {
    throw new ContractError(`Tier is not defined! Allowed tiers: ${Object.keys(tiers).join(', ')}`);
  }

  // Set the maximum amount of subdomains and minimum TTLSeconds for this name based on the selected tier
  const maxSubdomains = tiers[tier].maxSubdomains;
  const minTtlSeconds = tiers[tier].minTtlSeconds;

  // set the end lease period for this based on number of years
  const endTimestamp = currentBlockTime + SECONDS_IN_A_YEAR * years;

  // enforce lower case names
  name = name.toLowerCase();

  // check if it is a valid subdomain name for the smartweave contract
  const namePattern = new RegExp('^[a-zA-Z0-9-]+$');
  const nameRes = namePattern.test(name);
  if (
    name.charAt(0) === '-' || // the name has a leading dash
    typeof name !== 'string' ||
    name.length > MAX_NAME_LENGTH || // the name is too long
    !nameRes || // the name does not match our regular expression
    name === 'www' || // reserved
    name === '' // reserved
  ) {
    throw new ContractError('Invalid ArNS Record Name');
  }

  // Determine price of name
  const qty = fees[name.length.toString()] * tier * years;

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${qty} token(s)!`,
    );
  }

  if (typeof contractTxId !== "string") {
    throw new ContractError("ANT Smartweave Contract Address must be a string");
  } else if (contractTxId.toLowerCase() === RESERVED_ATOMIC_TX_ID) {
    // if this is an atomic name registration, then the transaction ID for this interaction is used for the ANT smartweave contract address
    contractTxId = SmartWeave.transaction.id;
  } else {
    // check if it is a valid arweave transaction id for the smartweave contract
    const txIdPattern = new RegExp("^[a-zA-Z0-9_-]{43}$");
    const txIdres = txIdPattern.test(contractTxId);
    if (contractTxId.length !== TX_ID_LENGTH || !txIdres) {
      throw new ContractError("Invalid ANT Smartweave Contract Address");
    }
  }

  // Check if the requested name already exists, if not reduce balance and add it
  // TODO: foundation rewards logic
  if (!records[name]) {
    // No name created, so make a new one
    balances[caller] -= qty; // reduce callers balance
    // TODO: logic for protocol balance
    // foundation.balance += Math.floor(qty * (FOUNDATION_PERCENTAGE / 100)); // increase foundation balance using the foundation percentage
    // state.rewards += Math.floor(qty * ((100 - FOUNDATION_PERCENTAGE) / 100)); // increase protocol rewards without the foundation percentage
    records[name] = {
      tier,
      contractTxId,
      endTimestamp,
      maxSubdomains,
      minTtlSeconds,
    };
  // assumes lease expiration
  } else if (
    records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <
    currentBlockTime
  ) {
    // This name's lease has expired and can be repurchased
    balances[caller] -= qty; // reduce callers balance
    records[name] = {
      tier,
      contractTxId,
      endTimestamp,
      maxSubdomains,
      minTtlSeconds,
    };
  } else {
    throw new ContractError("This name already exists in an active lease");
  }

  return { state };
};
