import {
  ARNS_NAME_RESERVED_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  INVALID_YEARS_MESSAGE,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
  TIERS,
} from '../../constants';
import { ContractResult, IOState, PstAction, ServiceTier } from '../../types';
import { calculateTotalRegistrationFee } from '../../utilities';
// composed by ajv at build
import { validateBuyRecord } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export class BuyRecord {
  function = 'buyRecord';
  name: string;
  contractTxId: string;
  years: number;
  tier: string;

  constructor(input: any, defaults: { tier: string }) {
    // validate using ajv validator
    if (!validateBuyRecord(input)) {
      throw new ContractError(INVALID_INPUT_MESSAGE);
    }
    const {
      name,
      contractTxId = RESERVED_ATOMIC_TX_ID,
      years = 1,
      tier = defaults.tier,
    } = input;
    this.name = name.trim().toLowerCase();
    (this.contractTxId =
      contractTxId === RESERVED_ATOMIC_TX_ID
        ? SmartWeave.transaction.id
        : contractTxId),
      (this.years = years);
    this.tier = tier;
  }
}

export const buyRecord = (
  state: IOState,
  { caller, input }: PstAction,
): ContractResult => {
  // get all other relevant state data
  const { balances, records, reserved, fees, tiers = TIERS } = state;
  const { current: currentTiers, history: allTiers } = tiers;
  const currentBlockTime = +SmartWeave.block.timestamp;
  const buyRecordInput = new BuyRecord(input, {
    tier: tiers.current[0],
  }); // does validation on constructor
  const { name, contractTxId, years, tier } = buyRecordInput;

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
  if (years > MAX_YEARS) {
    throw new ContractError(INVALID_YEARS_MESSAGE);
  }

  // list of all active tier ID's
  if (!currentTiers.includes(tier)) {
    throw new ContractError(
      `Invalid value for "tier". Must be one of: ${currentTiers.join(',')}`,
    );
  }

  // the tier purchased
  const purchasedTier: ServiceTier = allTiers.find((t) => t.id === tier);

  // set the end lease period for this based on number of years
  const endTimestamp = currentBlockTime + SECONDS_IN_A_YEAR * years;

  if (reserved[name]) {
    const { target, endTimestamp: reservedEndTimestamp } = reserved[name];

    /**
     * Three scenarios:
     *
     * 1. name is reserved, regardless of length can be purchased only by target, unless expired
     * 2. name is reserved, but only for a certain amount of time
     * 3. name is reserved, with no target and no timestamp (i.e. target and timestamp are empty)
     */
    const handleReservedName = () => {
      const reservedByCaller = target === caller;
      const reservedExpired =
        reservedEndTimestamp &&
        reservedEndTimestamp <= +SmartWeave.block.timestamp;
      if (reservedByCaller || reservedExpired) {
        delete reserved[name];
        return;
      }

      throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
    };

    handleReservedName();
  } else {
    // not reserved but it's a short name, it can only be auctioned after the short name auction expiration date has passed
    const handleShortName = () => {
      /**
       * If a name is 1-4 characters, it can only be auctioned. Don't validate on expiration here.
       */
      if (name.length < MINIMUM_ALLOWED_NAME_LENGTH) {
        throw new ContractError(INVALID_SHORT_NAME);
      }
      return;
    };
    handleShortName();
  }
  // calculate the total fee (initial registration + annual)
  const totalFee = calculateTotalRegistrationFee(
    name,
    fees,
    purchasedTier,
    years,
  );

  if (balances[caller] < totalFee) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${totalFee} token(s)!`,
    );
  }

  // Check if the requested name already exists, if not reduce balance and add it
  if (
    records[name] &&
    records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD >
      +SmartWeave.block.timestamp
  ) {
    // No name created, so make a new one
    throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  // TODO: foundation rewards logic
  // record can be purchased
  balances[caller] -= totalFee; // reduce callers balance
  records[name] = {
    contractTxId,
    endTimestamp,
    tier,
    type: 'lease',
  };

  // update the records object
  state.records = records;
  state.reserved = reserved;
  state.balances = balances;
  return { state };
};
