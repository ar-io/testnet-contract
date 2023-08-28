import {
  ARNS_NAME_RESERVED_MESSAGE,
  AUCTION_SETTINGS,
  DEFAULT_UNDERNAME_COUNT,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateMinimumAuctionBid,
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
  walletHasSufficientBalance,
} from '../../utilities';
// composed by ajv at build
import { validateAuctionBid } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export class AuctionBid {
  function: 'submitAuctionBid';
  name: string;
  qty?: number;
  type: 'lease' | 'permabuy';
  contractTxId: string;
  years?: number;
  constructor(input: any) {
    // validate using ajv validator
    if (!validateAuctionBid(input)) {
      throw new ContractError(
        `${INVALID_INPUT_MESSAGE} for ${this.function}: ${(
          validateAuctionBid as any
        ).errors
          .map((e) => {
            const key = e.instancePath.replace('/', '');
            const value = input[key];
            return `${key} ('${value}') ${e.message}`;
          })
          .join(', ')}`,
      );
    }

    const { name, qty, type = 'lease', contractTxId } = input;
    this.name = name.trim().toLowerCase();
    this.qty = qty;
    this.type = type;
    this.contractTxId =
      contractTxId === RESERVED_ATOMIC_TX_ID
        ? SmartWeave.transaction.id
        : contractTxId;
    if (this.type === 'lease') {
      this.years = 1; // default to one year for lease, don't set for permabuy
    }
  }
}

export const submitAuctionBid = (
  state: IOState,
  { caller, input }: PstAction,
): ContractResult => {
  const { auctions = {}, fees, records, reserved, balances } = state;

  // does validation on constructor
  const {
    name,
    qty: submittedBid,
    type,
    contractTxId,
    years,
  } = new AuctionBid(input);

  // name already exists on an active lease
  if (records[name]) {
    const { endTimestamp, type } = records[name];

    /**
     * Three scenarios:
     *
     * 1. The name is currently in records, but it's lease is expired - this means it can be removed from state
     * 2. The name is currently in records, and not expired
     * 3. The name is currently in records and is a permabuy
     * @returns
     */
    const handleExistingName = () => {
      if (
        type === 'lease' &&
        endTimestamp &&
        endTimestamp + SECONDS_IN_GRACE_PERIOD <= +SmartWeave.block.timestamp
      ) {
        // lease has expired, remove from state and it's available for auction
        delete records[name];
        return;
      }

      // throw an error saying the name is already owned
      throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
    };

    handleExistingName();
  }

  if (reserved[name]) {
    const { target, endTimestamp: reservedEndTimestamp } = reserved[name];

    /**
     * Three scenarios:
     *
     * 1. name is reserved, regardless of length can be purchased only by target, unless expired - the reserved name from state, making it available for anyone
     * 2. name is reserved, but only for a certain amount of time
     * 3. name is reserved, with no target and no timestamp (i.e. target and timestamp are empty)
     */
    const handleReservedName = () => {
      const reservedByCaller = target === caller;
      const reservedExpired =
        reservedEndTimestamp &&
        reservedEndTimestamp <= +SmartWeave.block.timestamp;
      // the reservation has expired - delete from state and make it available for auctions/buying
      if (!reservedByCaller && !reservedExpired) {
        throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
      }

      /**
       * TODO: we may or may not handle premium names
       * {
       *     "microsoft": {
       *          "endTimestamp": today,
       *          "premium": true, // if premium name - don't delete from reserved and update the endTimestamp and startTimestamp
       *     },
       * }
       */

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
        +SmartWeave.block.timestamp < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP
      ) {
        throw new ContractError(INVALID_SHORT_NAME);
      }
      return;
    };
    handleShortName();
  }

  // all the things we need to handle an auction bid
  const currentBlockHeight = +SmartWeave.block.height;
  const {
    floorPriceMultiplier,
    startPriceMultiplier,
    decayInterval,
    decayRate,
    duration,
  } = AUCTION_SETTINGS;

  // calculate the standard registration fee
  const registrationFee =
    type === 'lease'
      ? calculateTotalRegistrationFee(
          name,
          fees,
          years!,
          +SmartWeave.block.timestamp,
        )
      : calculatePermabuyFee(name, fees, +SmartWeave.block.timestamp);

  // no current auction, create one and vault the balance from the user
  if (!auctions[name]) {
    // floor price multiplier could be a decimal, or whole number (e.g. 0.5 vs 2)
    const calculatedFloor = registrationFee * floorPriceMultiplier;
    // if someone submits a high floor price, we'll take it
    const floorPrice = submittedBid
      ? Math.max(submittedBid, calculatedFloor)
      : calculatedFloor;
    // multiply by the floor price, as it could be higher than the calculated floor
    const startPrice = floorPrice * startPriceMultiplier;

    // throw an error on invalid balance
    if (!walletHasSufficientBalance(balances, caller, floorPrice)) {
      throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
    }

    // create the initial auction bid
    const initialAuctionBid = {
      floorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
      startPrice,
      contractTxId,
      startHeight: currentBlockHeight, // auction starts right away
      endHeight: currentBlockHeight + duration, // auction ends after the duration
      type,
      initiator: caller, // the balance that the floor price is decremented from
      ...(years ? { years } : {}),
      decayInterval,
      decayRate,
      // TODO: ADD PRICES OBJECT
    };
    auctions[name] = initialAuctionBid; // create the auction object
    balances[caller] -= floorPrice; // decremented based on the floor price

    // update the state
    state.auctions = auctions;
    state.balances = balances;
    state.records = records;
    state.reserved = reserved;
    return { state };
  }

  // current auction in the state, validate the bid and update state
  if (auctions[name]) {
    const existingAuction = auctions[name];
    const auctionEndHeight = existingAuction.startHeight + auctionDuration;
    const endTimestamp =
      existingAuction.type === 'lease'
        ? +SmartWeave.block.timestamp +
          SECONDS_IN_A_YEAR * existingAuction.years!
        : undefined;

    // calculate the current bid price and compare it to the floor price set by the initiator
    const currentRequiredMinimumBid = calculateMinimumAuctionBid({
      startHeight: existingAuction.startHeight,
      startPrice: existingAuction.startPrice,
      floorPrice: existingAuction.floorPrice,
      currentBlockHeight,
      decayRate,
      decayInterval,
    });
    if (
      existingAuction.startHeight > currentBlockHeight ||
      currentBlockHeight > auctionEndHeight ||
      existingAuction.floorPrice >= currentRequiredMinimumBid
    ) {
      /**
       * We can update the state if a bid was placed after an auction has ended, or the initial floor was set to a value higher than the current minimum bid required to win.
       *
       * To do so we need to:
       * 1. Update the records to reflect their new name
       * 2. Delete the auction object
       * 3. Return an error to the second bidder, telling them they did not win the bid.
       */

      records[name] = {
        contractTxId: existingAuction.contractTxId,
        type: existingAuction.type,
        startTimestamp: +SmartWeave.block.timestamp,
        // only include timestamp on lease
        undernames: DEFAULT_UNDERNAME_COUNT,
        // something to think about - what if a ticking of state never comes? what do we set endTimestamp to?
        ...(existingAuction.type === 'lease' ? { endTimestamp } : {}),
      };

      // delete the auction
      delete auctions[name];
      // update the state
      state.auctions = auctions;
      state.records = records;
      state.balances = balances;

      // this ticks the state - but doesn't notify the second bidder...sorry!
      // better put: the purpose of their interaction was rejected, but the state incremented forwarded
      return { state };
      // validate this would break validation
      // throw Error('The auction has already been won.');
    }

    // we could throw an error if qty wasn't provided
    if (submittedBid && submittedBid < currentRequiredMinimumBid) {
      throw new ContractError(
        `The bid (${submittedBid} IO) is less than the current required minimum bid of ${currentRequiredMinimumBid} IO.`,
      );
    }

    // the bid is the minimum of what was submitted and what is actually needed
    // allowing the submittedBid to be optional, takes the responsibility of apps having to
    // dynamically calculate prices all the time
    let finalBid = submittedBid
      ? Math.min(submittedBid, currentRequiredMinimumBid)
      : currentRequiredMinimumBid;

    // we need to consider if the second bidder is the initiator, and only decrement the difference
    if (caller === existingAuction.initiator) {
      finalBid -= existingAuction.floorPrice;
    }

    // throw an error if the wallet doesn't have the balance for the bid
    if (!walletHasSufficientBalance(balances, caller, finalBid)) {
      throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
    }

    /**
     * When a second bidder wins the bid, we can update the state completely to reflect the auction has been won.
     *
     * To do so we need to:
     * 1. Update the records
     * 2. Return the initial floor price back to the initiator
     * 3. Decrement the balance of the second bidder
     */

    // the bid has been won, update the records
    records[name] = {
      contractTxId: contractTxId, // only update the new contract tx id
      type: existingAuction.type,
      startTimestamp: +SmartWeave.block.timestamp, // overwrite initial start timestamp
      undernames: DEFAULT_UNDERNAME_COUNT,
      // only include timestamp on lease, endTimestamp is easy in this situation since it was a second interaction that won it
      ...(existingAuction.type === 'lease' ? { endTimestamp } : {}),
    };

    // decrement the vaulted balance from the second bidder
    balances[caller] -= finalBid;

    // return the originally revoked balance back to the initiator, assuming the initiator is not the second bidder
    if (caller !== existingAuction.initiator) {
      balances[existingAuction.initiator] += existingAuction.floorPrice;
    }
    // TODO: add finalBid to protocol balance
    // also add the existing floor to protocol balance
    if (caller == existingAuction.initiator) {
      // add protocol balance of floor price to protocol balance
    }

    // delete the auction
    delete auctions[name];
    // update the state
    state.auctions = auctions;
    state.balances = balances;
    state.records = records;
    state.reserved = reserved;
    return { state };
  }

  // no auction - just return
  return {
    state,
  };
};
