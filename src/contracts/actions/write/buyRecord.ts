import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_ANNUAL_PERCENTAGE_FEE,
  DEFAULT_INVALID_ARNS_NAME_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  MAX_NAME_LENGTH,
  MAX_YEARS,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  TX_ID_LENGTH,
} from '@/constants';
import { calculateTotalRegistrationFee } from '@/utilities';

import {
  ContractResult,
  IOState,
  PstAction,
  ServiceTier,
} from '../../types/types';

declare const ContractError;
declare const SmartWeave: any;

export const buyRecord = async (
  state: IOState,
  {
    caller,
    input: { name, contractTxId, years, tierNumber = ALLOWED_ACTIVE_TIERS[0] },
  }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const fees = state.fees;
  const currentTiers = state.tiers.current;
  const allTiers = state.tiers.history;
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
      'Invalid value for "years". Must be an integer greater than zero and less than the max years',
    );
  }

  // list of all active tier ID's
  const activeTierNumbers = Object.keys(currentTiers).map((k) => +k);
  if (
    !Number.isInteger(tierNumber) ||
    !activeTierNumbers.includes(tierNumber)
  ) {
    throw new ContractError(
      `Invalid value for "tier". Must be ${Object.values(currentTiers).join(
        ',',
      )}`,
    );
  }

  // the tier purchased
  const selectedTierID = currentTiers[tierNumber];
  const purchasedTier: ServiceTier = allTiers.find(
    (t) => t.id === selectedTierID,
  );

  if (!purchasedTier) {
    throw new ContractError('The tier purchased is not in the states history.');
  }

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
    throw new ContractError(DEFAULT_INVALID_ARNS_NAME_MESSAGE);
  }

  // calculate the total fee (initial registration + annual)
  const totalFee = calculateTotalRegistrationFee(
    name,
    state,
    purchasedTier,
    years,
  );

  if (balances[caller] < totalFee) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${totalFee} token(s)!`,
    );
  }

  if (typeof contractTxId !== 'string') {
    throw new ContractError('ANT Smartweave Contract Address must be a string');
  } else if (contractTxId.toLowerCase() === RESERVED_ATOMIC_TX_ID) {
    // if this is an atomic name registration, then the transaction ID for this interaction is used for the ANT smartweave contract address
    contractTxId = SmartWeave.transaction.id;
  } else {
    // check if it is a valid arweave transaction id for the smartweave contract
    const txIdPattern = new RegExp('^[a-zA-Z0-9_-]{43}$');
    const txIdres = txIdPattern.test(contractTxId);
    if (contractTxId.length !== TX_ID_LENGTH || !txIdres) {
      throw new ContractError('Invalid ANT Smartweave Contract Address');
    }
  }

  // Check if the requested name already exists, if not reduce balance and add it
  // TODO: foundation rewards logic
  if (!records[name]) {
    // No name created, so make a new one
    balances[caller] -= totalFee; // reduce callers balance
    records[name] = {
      contractTxId,
      endTimestamp,
      tier: selectedTierID,
    };
    // assumes lease expiration
  } else if (
    records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <
    currentBlockTime
  ) {
    // This name's lease has expired and can be repurchased
    balances[caller] -= totalFee; // reduce callers balance
    records[name] = {
      contractTxId,
      endTimestamp,
      tier: selectedTierID,
    };
  } else {
    throw new ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  // update the records object
  state.records = records;

  return { state };
};
