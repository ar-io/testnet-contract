import {
  ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_SHORT_NAME,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { tallyNamePurchase } from '../../pricing';
import {
  AuctionSettings,
  BlockHeight,
  ContractResult,
  IOState,
  PstAction,
  RegistrationType,
} from '../../types';
import {
  calculateMinimumAuctionBid,
  calculateRegistrationFee,
  createAuctionObject,
  getInvalidAjvMessage,
  isActiveReservedName,
  isExistingActiveRecord,
  isShortNameRestricted,
  walletHasSufficientBalance,
} from '../../utilities';
// composed by ajv at build
import { validateAuctionBid } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export class AuctionBid {
  name: string;
  qty?: number;
  type: RegistrationType;
  contractTxId: string;
  years?: number;
  constructor(input: any) {
    // validate using ajv validator
    if (!validateAuctionBid(input)) {
      throw new ContractError(getInvalidAjvMessage(validateAuctionBid, input));
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
  const {
    auctions = {},
    fees,
    records,
    reserved,
    settings,
    balances,
    demandFactoring,
  } = state;

  // does validation on constructor
  const {
    name,
    qty: submittedBid,
    type,
    contractTxId,
    years,
  } = new AuctionBid(input);

  const currentBlockTimestamp = +SmartWeave.block.timestamp;

  if (
    isActiveReservedName({
      caller,
      reservedName: reserved[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
  }

  if (isShortNameRestricted({ name, currentBlockTimestamp })) {
    throw new ContractError(INVALID_SHORT_NAME);
  }

  if (
    isExistingActiveRecord({
      record: records[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  // get the current auction settings, create one of it doesn't exist yet
  const currentAuctionSettings: AuctionSettings = settings.auctions;

  // all the things we need to handle an auction bid
  const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);
  const { decayInterval, decayRate, auctionDuration } = currentAuctionSettings;

  // calculate the registration fee taking into account demand factoring
  const registrationFee = calculateRegistrationFee({
    name,
    fees,
    years,
    type,
    currentBlockTimestamp,
    demandFactoring,
  });

  // no current auction, create one and vault the balance from the user
  if (!auctions[name]) {
    // create the initial auction bid
    const initialAuctionBid = createAuctionObject({
      auctionSettings: currentAuctionSettings,
      type,
      initialRegistrationFee: registrationFee,
      currentBlockHeight: +SmartWeave.block.height,
      initiator: caller,
      providedFloorPrice: submittedBid,
      contractTxId,
    });

    // throw an error on invalid balance
    if (
      !walletHasSufficientBalance(
        balances,
        caller,
        initialAuctionBid.floorPrice,
      )
    ) {
      throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
    }

    auctions[name] = initialAuctionBid; // create the auction object
    // TODO: where do we put this temporarily?
    balances[caller] -= initialAuctionBid.floorPrice; // decremented based on the floor price

    // delete the rename if exists
    if (reserved[name]) {
      delete reserved[name];
    }

    // delete the rename if exists
    if (reserved[name]) {
      delete reserved[name];
    }

    // update the state
    state.auctions = auctions;
    state.balances = balances;
    state.records = records;
    state.reserved = reserved;
  } else if (auctions[name]) {
    const existingAuction = auctions[name];
    const auctionEndHeight = existingAuction.startHeight + auctionDuration;
    const endTimestamp =
      existingAuction.type === 'lease'
        ? +SmartWeave.block.timestamp +
          SECONDS_IN_A_YEAR * existingAuction.years!
        : undefined;

    // calculate the current bid price and compare it to the floor price set by the initiator
    const currentRequiredMinimumBid = calculateMinimumAuctionBid({
      startHeight: new BlockHeight(existingAuction.startHeight),
      startPrice: existingAuction.startPrice,
      floorPrice: existingAuction.floorPrice,
      currentBlockHeight: currentBlockHeight,
      decayRate,
      decayInterval,
    });
    if (
      existingAuction.startHeight > currentBlockHeight.valueOf() ||
      currentBlockHeight.valueOf() > auctionEndHeight ||
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

    // return the originally revoked balance back to the initiator, assuming the initiator is not the second bidder
    if (caller !== existingAuction.initiator) {
      balances[existingAuction.initiator] += existingAuction.floorPrice;
    } else {
      // add back the initial floor price to the amount returned to the protocol balances
      balances[SmartWeave.contract.id] += existingAuction.floorPrice;
    }

    // decrement the final bids and move to owner wallet
    balances[caller] -= finalBid;
    balances[SmartWeave.contract.id] += finalBid;

    // delete the auction
    delete auctions[name];
    // update the state
    state.auctions = auctions;
    state.balances = balances;
    state.records = records;
    state.reserved = reserved;

    state.demandFactoring = tallyNamePurchase(state.demandFactoring);
  }

  // return updated state
  return { state };
};
