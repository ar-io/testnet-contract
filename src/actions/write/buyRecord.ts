import {
  DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_INVALID_ARNS_NAME_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_TIERS,
  MAX_NAME_LENGTH,
  MAX_YEARS,
  RESERVED_ATOMIC_TX_ID,
  RESERVED_CATEGORIES,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  TX_ID_LENGTH,
} from '../../constants';
import { ContractResult, IOState, PstAction, ServiceTier } from '../../types';
import { calculateTotalRegistrationFee } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

export const buyRecord = async (
  state: IOState,
  {
    caller,
    input: { name, contractTxId, years = 1, tierNumber = 1 },
  }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const reserved = state.reserved;
  const currentTiers =
    state.tiers?.current ??
    DEFAULT_TIERS.reduce(
      (acc, tier, index) => ({
        ...acc,
        [index + 1]: tier.id,
      }),
      {},
    );
  const allTiers = state.tiers?.history ?? DEFAULT_TIERS;
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
  const purchasedTier: ServiceTier =
    allTiers.find((t) => t.id === selectedTierID) ?? DEFAULT_TIERS[0];

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
    name === '' // reserved
  ) {
    throw new ContractError(DEFAULT_INVALID_ARNS_NAME_MESSAGE);
  }

  // If the name length is in the reserved list, then it cannot be purchased
  if (name.length.toString() in reserved) {
    if (reserved[name.length.toString()].target !== caller) {
      if (reserved[name.length.toString()].endTimestamp === undefined) {
        throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
      } else if (
        reserved[name.length.toString()].endTimestamp >
        +SmartWeave.block.timestamp
      ) {
        throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
      }
    }
  }

  // If the name is in the reserved list, then it cannot be purchased
  if (name in reserved) {
    if (reserved[name].target !== caller) {
      if (reserved[name].endTimestamp === undefined) {
        throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
      } else if (reserved[name].endTimestamp > +SmartWeave.block.timestamp) {
        throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
      }
    }
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
