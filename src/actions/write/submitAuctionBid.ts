import {
  calculateMinimumAuctionBid,
  createAuctionObject,
  getEndTimestampForAuction,
} from '../../auctions';
import {
  ARNS_NAME_AUCTION_EXPIRED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INSUFFICIENT_FUNDS_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
} from '../../constants';
import { tallyNamePurchase } from '../../pricing';
import {
  AuctionSettings,
  Balances,
  BlockHeight,
  BlockTimestamp,
  ContractWriteResult,
  DeepReadonly,
  IOState,
  PstAction,
  Records,
  RegistrationType,
} from '../../types';
import {
  assertAvailableRecord,
  calculateExistingAuctionBidForCaller,
  getInvalidAjvMessage,
  incrementBalance,
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from '../../utilities';
// composed by ajv at build
import { validateAuctionBid } from '../../validations';

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

    const {
      name,
      qty,
      type = 'lease',
      contractTxId = RESERVED_ATOMIC_TX_ID,
    } = input;
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
  state: DeepReadonly<IOState>,
  { caller, input }: PstAction,
): ContractWriteResult => {
  const updatedBalances: Balances = {
    [SmartWeave.contract.id]: state.balances[SmartWeave.contract.id] || 0,
    [caller]: state.balances[caller] || 0,
  };
  const updatedRecords: Records = {};

  // does validation on constructor
  const { name, qty: submittedBid, type, contractTxId } = new AuctionBid(input);

  const currentBlockTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);
  const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

  // TODO: check the wallet has any balance, move this an assert function

  // throws errors if the name is not available (reserved or owned)
  assertAvailableRecord({
    caller,
    name,
    records: state.records,
    reserved: state.reserved,
    currentBlockTimestamp,
  });

  // existing auction, handle the bid
  if (state.auctions[name]) {
    // all the things we need to handle an auction bid
    const existingAuction = state.auctions[name];

    if (currentBlockHeight.valueOf() > existingAuction.endHeight) {
      throw new ContractError(ARNS_NAME_AUCTION_EXPIRED_MESSAGE);
    }

    // calculate the current bid price and compare it to the floor price set by the initiator
    const currentRequiredMinimumBid = calculateMinimumAuctionBid({
      startHeight: new BlockHeight(existingAuction.startHeight),
      startPrice: existingAuction.startPrice,
      floorPrice: existingAuction.floorPrice,
      currentBlockHeight: currentBlockHeight,
      decayRate: existingAuction.settings.decayRate,
      decayInterval: existingAuction.settings.decayInterval,
    });

    // we could throw an error if qty wasn't provided
    if (submittedBid && submittedBid < currentRequiredMinimumBid.valueOf()) {
      throw new ContractError(
        `The bid (${submittedBid} IO) is less than the current required minimum bid of ${currentRequiredMinimumBid.valueOf()} IO.`,
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
      !walletHasSufficientBalance(
        state.balances,
        caller,
        finalBidForCaller.valueOf(),
      )
    ) {
      throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
    }

    const endTimestamp = getEndTimestampForAuction({
      auction: existingAuction,
      currentBlockTimestamp,
    });

    // the bid has been won, update the records
    updatedRecords[name] = {
      contractTxId: contractTxId, // only update the new contract tx id
      type: existingAuction.type,
      startTimestamp: +SmartWeave.block.timestamp, // overwrite initial start timestamp
      undernames: DEFAULT_UNDERNAME_COUNT,
      // only include timestamp on lease, endTimestamp is easy in this situation since it was a second interaction that won it
      ...(endTimestamp && {
        endTimestamp: endTimestamp.valueOf(),
      }),
      purchasePrice: currentRequiredMinimumBid.valueOf(), // the total amount paid for the name
    };

    /**
     * Give the total value to the protocol
     * Deduct the unsettled final bid value from the caller
     * Return floor price from the auction's vaulted balance to the initiator, if necessary
     */
    incrementBalance(
      updatedBalances,
      SmartWeave.contract.id,
      currentRequiredMinimumBid.valueOf(),
    );
    unsafeDecrementBalance(
      updatedBalances,
      caller,
      finalBidForCaller.valueOf(),
      false,
    );

    if (caller !== existingAuction.initiator) {
      incrementBalance(
        updatedBalances,
        existingAuction.initiator,
        existingAuction.floorPrice,
      );
    }

    // update the state
    const balances = {
      ...state.balances,
      ...updatedBalances,
    };

    Object.keys(updatedBalances)
      .filter((address) => updatedBalances[address] === 0)
      .forEach((address) => delete balances[address]);

    // update our records
    const records = {
      ...state.records,
      ...updatedRecords,
    };

    // remove the current name from auction
    const { [name]: _, ...auctions } = state.auctions;

    // update our state
    Object.assign(state, {
      auctions,
      balances,
      records,
      demandFactoring: tallyNamePurchase(
        state.demandFactoring,
        currentRequiredMinimumBid.valueOf(),
      ),
    });
    // return updated state
    return { state: state as IOState };
  }

  // no current auction, create one and vault the balance (floor price) from the user in the auction
  // calculate the registration fee taking into account demand factoring
  // get the current auction settings, create one if it doesn't exist yet
  const currentAuctionSettings: AuctionSettings = state.settings.auctions;

  // create the initial auction bid
  const initialAuctionBid = createAuctionObject({
    name,
    type,
    fees: state.fees,
    auctionSettings: currentAuctionSettings,
    currentBlockTimestamp,
    demandFactoring: state.demandFactoring,
    currentBlockHeight,
    initiator: caller,
    contractTxId,
  });

  // throw an error on invalid balance
  if (
    !walletHasSufficientBalance(
      state.balances,
      caller,
      initialAuctionBid.floorPrice,
    )
  ) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  unsafeDecrementBalance(
    updatedBalances,
    caller,
    initialAuctionBid.floorPrice,
    false,
  );

  // delete the rename if exists in reserved
  const { [name]: _, ...reserved } = state.reserved;

  // update auctions
  const auctions = {
    ...state.auctions,
    [name]: initialAuctionBid,
  };

  // update balances
  const balances = {
    ...state.balances,
    ...updatedBalances,
  };

  Object.keys(updatedBalances)
    .filter((address) => updatedBalances[address] === 0)
    .forEach((address) => delete balances[address]);

  // update the state
  Object.assign(state, {
    auctions,
    balances,
    reserved,
  });

  // we do not update demand factor here, as it is not a purchase yet
  return { state: state as IOState };
};
