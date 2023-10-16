import {
  ARNS_NAME_AUCTION_EXPIRED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INSUFFICIENT_FUNDS_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
} from '../../constants';
import { calculateMinimumAuctionBid, tallyNamePurchase } from '../../pricing';
import {
  AuctionSettings,
  BlockHeight,
  BlockTimestamp,
  ContractResult,
  IOState,
  PstAction,
  RegistrationType,
} from '../../types';
import {
  assertAvailableRecord,
  calculateExistingAuctionBidForCaller,
  calculateRegistrationFee,
  createAuctionObject,
  getEndTimestampForAuction,
  getInvalidAjvMessage,
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
      throw new ContractError(
        getInvalidAjvMessage(validateAuctionBid, input, 'auctionBid'),
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
  const {
    auctions,
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

  const currentBlockTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);
  const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

  // TODO: check the wallet has any balance, move this an assert function
  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }
  // throws errors if the name is not available (reserved or owned)
  assertAvailableRecord({
    caller,
    name,
    records,
    reserved,
    currentBlockTimestamp,
  });

  // get the current auction settings, create one of it doesn't exist yet
  const currentAuctionSettings: AuctionSettings = settings.auctions;

  // existing auction, handle the bid
  if (auctions[name]) {
    // all the things we need to handle an auction bid
    const existingAuction = auctions[name];

    if (
      existingAuction.startHeight > currentBlockHeight.valueOf() ||
      currentBlockHeight.valueOf() > existingAuction.endHeight
    ) {
      // TODO: tick state should correct this from happening
      throw new ContractError(ARNS_NAME_AUCTION_EXPIRED_MESSAGE);
    }

    // calculate the current bid price and compare it to the floor price set by the initiator
    const currentRequiredMinimumBid = calculateMinimumAuctionBid({
      startHeight: new BlockHeight(existingAuction.startHeight),
      startPrice: existingAuction.startPrice,
      floorPrice: existingAuction.floorPrice,
      currentBlockHeight: currentBlockHeight,
      decayRate: currentAuctionSettings.decayRate,
      decayInterval: currentAuctionSettings.decayInterval,
    });

    // we could throw an error if qty wasn't provided
    if (submittedBid && submittedBid < currentRequiredMinimumBid.valueOf()) {
      throw new ContractError(
        `The bid (${submittedBid} IO) is less than the current required minimum bid of ${currentRequiredMinimumBid} IO.`,
      );
    }

    /**
     * When a second bidder wins the bid, we can update the state completely to reflect the auction has been won.
     *
     * To do so we need to:
     * 1. Update the records
     * 2. Return the initial floor price back to the initiator
     * 3. Decrement the balance of the second bidder
     */
    const finalBidForCaller = calculateExistingAuctionBidForCaller({
      auction: existingAuction,
      submittedBid,
      caller,
      requiredMinimumBid: currentRequiredMinimumBid,
    });

    // throw an error if the wallet doesn't have the balance for the bid
    if (
      !walletHasSufficientBalance(balances, caller, finalBidForCaller.valueOf())
    ) {
      throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
    }

    const endTimestamp = getEndTimestampForAuction({
      auction: existingAuction,
      currentBlockTimestamp,
    });

    // the bid has been won, update the records
    records[name] = {
      contractTxId: contractTxId, // only update the new contract tx id
      type: existingAuction.type,
      startTimestamp: +SmartWeave.block.timestamp, // overwrite initial start timestamp
      undernames: DEFAULT_UNDERNAME_COUNT,
      // only include timestamp on lease, endTimestamp is easy in this situation since it was a second interaction that won it
      ...{
        endTimestamp: endTimestamp ? endTimestamp.valueOf() : undefined,
      },
    };

    // delete the auction
    delete auctions[name];

    /**
     * TODO: make this a function and unit test the shit out of it
     *
     * Give the unsettled value to the protocol
     * Deduct the unsettled value from the caller
     * Return floor price from the protocol balance to the initiator, if necessary
     */
    balances[SmartWeave.contract.id] += finalBidForCaller.valueOf();
    balances[caller] -= finalBidForCaller.valueOf();
    if (caller !== existingAuction.initiator) {
      balances[existingAuction.initiator] += existingAuction.floorPrice;
      balances[SmartWeave.contract.id] -= existingAuction.floorPrice;
    }

    // update the state
    state.auctions = auctions; // NOTE: we don't need to reassign here as auctions is a reference
    state.balances = balances; // NOTE: we don't need to reassign here as auctions is a reference
    state.records = records; // NOTE: we don't need to reassign here as auctions is a reference
    state.reserved = reserved; // NOTE: we don't need to reassign here as auctions is a reference
    state.demandFactoring = tallyNamePurchase(demandFactoring);
    // return updated state
    return { state };
  }

  // no current auction, create one and vault the balance from the user
  // calculate the registration fee taking into account demand factoring
  const registrationFee = calculateRegistrationFee({
    name,
    fees,
    years,
    type,
    currentBlockTimestamp,
    demandFactoring,
  });

  // create the initial auction bid
  const initialAuctionBid = createAuctionObject({
    auctionSettings: currentAuctionSettings,
    type,
    initialRegistrationFee: registrationFee,
    currentBlockHeight,
    initiator: caller,
    providedFloorPrice: submittedBid,
    contractTxId,
  });

  // throw an error on invalid balance
  if (
    !walletHasSufficientBalance(balances, caller, initialAuctionBid.floorPrice)
  ) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  auctions[name] = initialAuctionBid; // create the auction object
  balances[SmartWeave.contract.id] += initialAuctionBid.floorPrice; // vault the balance
  balances[caller] -= initialAuctionBid.floorPrice; // decremented based on the floor price

  // delete the rename if exists in reserved
  if (reserved[name]) {
    delete reserved[name]; // TODO: is this necessary
  }

  // update the state
  state.auctions = auctions; // NOTE: we don't need to reassign here as auctions is a reference
  state.balances = balances; // NOTE: we don't need to reassign here as balances is a reference
  state.reserved = reserved; // NOTE: we don't need to reassign here as reserved is a reference
  // we do not update demand factor here, as it is not a purchase yet
  return { state };
};
