import { ContractResult, IOState, PstAction, ServiceTier } from '../../types';

import {
  DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE,
  DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_TIERS,
  INVALID_INPUT_MESSAGE,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import { calculateTotalRegistrationFee } from '../../utilities';

// composed by ajv at build
import { validateBuyRecord } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export type BuyRecord = {
  name: string;
  contractTxId: string;
  years: number;
  tierNumber: number;
};

export const buyRecord = (
  state: IOState,
  { caller, input }: PstAction,
): ContractResult => {
  // validate using ajv validator
  if (!validateBuyRecord(input)) {
    throw new ContractError(INVALID_INPUT_MESSAGE);
  }

  // we know it's solid, can safely cast as type
  const {
    name,
    contractTxId = RESERVED_ATOMIC_TX_ID,
    years = 1,
    tierNumber = 1,
  } = input as BuyRecord;
  const { balances, records, reserved, fees, tiers = DEFAULT_TIERS } = state;
  const { current: currentTiers, history: allTiers } = tiers;
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

  // Additional check if it includes a valid number of years (TODO: this may be set in contract settings)
  if (years > MAX_YEARS || years <= 0) {
    throw new ContractError(
      'Invalid value for "years". Must be an integer greater than zero and less than the max years',
    );
  }

  // list of all active tier ID's
  const activeTierNumbers = currentTiers.map((_, indx) => indx + 1);
  if (
    !activeTierNumbers.includes(tierNumber)
  ) {
    throw new ContractError(
      `Invalid value for "tier". Must be one of: ${activeTierNumbers.join(',')}`,
    );
  }

  // the tier purchased
  const selectedTierID = currentTiers[tierNumber - 1];
  const purchasedTier: ServiceTier =
    allTiers.find((t) => t.id === selectedTierID) ?? DEFAULT_TIERS[0];

  if (!purchasedTier) {
    throw new ContractError('The tier purchased is not in the states history.');
  }

  // set the end lease period for this based on number of years
  const endTimestamp = currentBlockTime + SECONDS_IN_A_YEAR * years;

  // enforce lower case names
  const formattedName = name.toLowerCase();

  if (
    !reserved[formattedName] &&
    formattedName.length < MINIMUM_ALLOWED_NAME_LENGTH
  ) {
    throw new ContractError(DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE);
  }

  if (reserved[formattedName]) {
    const { target, endTimestamp: reservedEndTimestamp } =
      reserved[formattedName];

    /**
     * Two scenarios:
     *
     * 1. name is reserved, regardless of length can be purchased only by target, unless expired
     * 2. name is reserved, but only for a certain amount of time
     */
    const handleReservedName = () => {
      const reservedByCaller = target === caller;
      const reservedExpired = reservedEndTimestamp &&
        reservedEndTimestamp <= +SmartWeave.block.timestamp;
      if (reservedByCaller || reservedExpired) {
        delete reserved[formattedName];
        return;
      }

      throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
    };



    handleReservedName();
  }
  // calculate the total fee (initial registration + annual)
  const totalFee = calculateTotalRegistrationFee(
    formattedName,
    fees,
    purchasedTier,
    years,
  );

  if (balances[caller] < totalFee) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${totalFee} token(s)!`,
    );
  }

  const selectedContractTxId =
    contractTxId === RESERVED_ATOMIC_TX_ID
      ? SmartWeave.transaction.id
      : contractTxId;

  // Check if the requested name already exists, if not reduce balance and add it
  if (
    records[formattedName] &&
    records[formattedName].endTimestamp + SECONDS_IN_GRACE_PERIOD >
      +SmartWeave.block.timestamp
  ) {
    // No name created, so make a new one
    throw new ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
  }
  
  // TODO: foundation rewards logic
  // record can be purchased
  balances[caller] -= totalFee; // reduce callers balance
  records[formattedName] = {
    contractTxId: selectedContractTxId,
    endTimestamp,
    tier: selectedTierID,
  };

  // update the records object
  state.records = records;
  state.reserved = reserved;
  state.balances = balances;
  return { state };
};
