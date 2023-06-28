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
import {
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
} from '../../utilities';
// composed by ajv at build
import { validateBuyRecord } from '../../validations.mjs';
import { submitAuctionBid } from './submitAuctionBid';

declare const ContractError;
declare const SmartWeave: any;

export class BuyRecord {
  function = 'buyRecord';
  name: string;
  contractTxId: string;
  years: number;
  tier: string;
  type: 'lease' | 'permabuy';
  auction: boolean;
  qty: number;

  constructor(input: any, defaults: { tier: string }) {
    // validate using ajv validator
    if (!validateBuyRecord(input)) {
      throw new ContractError(
        `${INVALID_INPUT_MESSAGE}: ${(validateBuyRecord as any).errors
          .map((e) => `${e.instancePath.replace('/', '')} ${e.message}`)
          .join(', ')}`,
      );
    }
    const {
      name,
      contractTxId = RESERVED_ATOMIC_TX_ID,
      years = 1,
      tier = defaults.tier,
      type = 'lease',
      auction = false,
      qty, // only used when passed to auction handler
    } = input;
    this.name = name.trim().toLowerCase();
    (this.contractTxId =
      contractTxId === RESERVED_ATOMIC_TX_ID
        ? SmartWeave.transaction.id
        : contractTxId),
      (this.years = years);
    this.tier = tier;
    this.type = type;
    this.auction = auction;
    this.qty = qty;
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
  const { name, contractTxId, years, tier, type, auction } = buyRecordInput;

  // auction logic if auction flag set
  if (auction) {
    return submitAuctionBid(state, {
      caller,
      input,
    });
  }

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

  // TODO: do we have a premium multiplier?
  // price them as a 2 char multiplier

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
      if (!reservedByCaller && !reservedExpired) {
        throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
      }

      delete reserved[name];
      return;
    };
    handleReservedName();
  } else {
    // not reserved but it's a short name, it can only be auctioned after the short name auction expiration date has passed
    const handleShortName = () => {
      /**
       * If a name is 1-4 characters, it can only be auctioned and after the set expiration.
       */
      if (
        name.length < MINIMUM_ALLOWED_NAME_LENGTH &&
        +SmartWeave.block.timestamp < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP &&
        !auction
      ) {
        throw new ContractError(INVALID_SHORT_NAME);
      }
      return;
    };
    handleShortName();
  }

  // the tier purchased
  const purchasedTier: ServiceTier = allTiers.find((t) => t.id === tier)!;

  // set the end lease period for this based on number of years if it's a lease
  const endTimestamp =
    type === 'lease' ? currentBlockTime + SECONDS_IN_A_YEAR * years : undefined;
  // calculate the total fee (initial registration + annual)
  const totalRegistrationFee =
    type === 'lease'
      ? calculateTotalRegistrationFee(name, fees, purchasedTier, years)
      : calculatePermabuyFee(name, fees, purchasedTier);

  if (balances[caller] < totalRegistrationFee) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${totalRegistrationFee} token(s)!`,
    );
  }

  // Check if the requested name exists on a lease and in a grace period
  if (
    records[name] &&
    records[name].type === 'lease' &&
    records[name].endTimestamp
  ) {
    const { endTimestamp } = records[name];
    if (
      endTimestamp &&
      endTimestamp + SECONDS_IN_GRACE_PERIOD > +SmartWeave.block.timestamp
    ) {
      // name is still on active lease during grace period
      throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
    }
  }

  // TODO: foundation rewards logic
  // record can be purchased
  balances[caller] -= totalRegistrationFee; // reduce callers balance
  records[name] = {
    contractTxId,
    tier,
    type,
    // only include timestamp on lease
    ...(type === 'lease' ? { endTimestamp } : {}),
  };

  // update the records object
  state.records = records;
  state.reserved = reserved;
  state.balances = balances;
  return { state };
};
