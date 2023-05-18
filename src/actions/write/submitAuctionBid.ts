import {
  DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_INVALID_QTY_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_PERMABUY_EXPIRATION,
  DEFAULT_PERMABUY_TIER,
  INVALID_INPUT_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import {
  AuctionSettings,
  ContractResult,
  IOState,
  PstAction,
  ServiceTier,
} from '../../types';
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
  name: string;
  qty?: number;
  type: 'lease' | 'permabuy';
  details: {
    contractTxId: string;
    tier: string;
    years?: number;
  };
  constructor(input: any, tiers) {
    // validate using ajv validator
    if (!validateAuctionBid(input)) {
      throw new ContractError(INVALID_INPUT_MESSAGE);
    }

    const { name, qty, type = 'lease', contractTxId } = input;
    this.name = name.trim().toLowerCase();
    this.qty = qty;
    this.type = type;
    this.details = {
      contractTxId:
        contractTxId === RESERVED_ATOMIC_TX_ID
          ? SmartWeave.transaction.id
          : contractTxId,
      ...(this.type === 'lease' ? { years: 1 } : {}), // default to one for lease, no expiration for permabuy
      tier:
        this.type === 'lease'
          ? tiers.current[0]
          : tiers.current[tiers.current.length - 1], // the top tier
    };
  }
}

export const submitAuctionBid = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const {
    auctions = {},
    fees,
    records,
    reserved,
    tiers,
    settings,
    balances,
  } = state;

  // does validation on constructor
  const {
    name,
    qty: submittedBid,
    type,
    details: bidDetails,
  } = new AuctionBid(input, tiers);

  // name already exists on an active lease
  if (records[name]) {
    const { endTimestamp, type } = records[name];

    /**
     * Three scenarios:
     *
     * 1. The name is currently in records, but it's lease is expired
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
        delete records[name];
        return;
      }

      throw new ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
    };

    handleExistingName();
  }

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

      throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
    };

    handleReservedName();
  }

  // get the current auction settings, create one of it doesn't exist yet
  const currentAuctionSettings: AuctionSettings =
    settings.auctions.history.find((a) => a.id === settings.auctions.current);

  if (!currentAuctionSettings) {
    throw Error('No auctions settings found.');
  }

  // validate we have tiers
  const { current: currentTiers, history: tierHistory } = tiers;

  if (!currentTiers || !tierHistory.length) {
    throw Error('No tiers found.');
  }

  // all the things we need to handle an auction bid
  const currentBlockHeight = +SmartWeave.block.height;
  const { decayInterval, decayRate, auctionDuration } = currentAuctionSettings;

  // calculate the standard registration fee
  const serviceTier = tierHistory.find(
    (t: ServiceTier) => t.id === bidDetails.tier,
  );
  const registrationFee =
    type === 'lease'
      ? calculateTotalRegistrationFee(name, fees, serviceTier, bidDetails.years)
      : calculatePermabuyFee(name, fees, settings.permabuy.multiplier);

  // current auction in the state, validate the bid and update state
  if (auctions[name]) {
    const existingAuction = auctions[name];
    const {
      startHeight,
      initialPrice,
      floorPrice,
      vault,
      type,
      details: { tier },
    } = existingAuction;
    const auctionEndHeight = startHeight + auctionDuration;
    const endTimestamp =
      +SmartWeave.block.timestamp + SECONDS_IN_A_YEAR * bidDetails.years; // 0 for permabuy
    if (
      startHeight > currentBlockHeight ||
      currentBlockHeight > auctionEndHeight
    ) {
      /**
       * We can update the state if a bid was placed after an auction has ended.
       *
       * To do so we need to:
       * 1. Update the records to reflect their new name
       * 2. Delete the auction object
       * 3. Return an error to the second bidder, telling them they did not win the bid.
       */

      records[name] = {
        contractTxId: existingAuction.details.contractTxId,
        tier,
        type,
        // only include timestamp on lease
        ...(type === 'lease' ? { endTimestamp } : {}),
      };

      // delete the auction
      delete auctions[name];
      // update the state
      state.auctions = auctions;
      state.records = records;
      state.balances = balances;
      throw Error('The auction has already been won.');
    }

    // validate the bid
    const requiredMinimumBid = calculateMinimumAuctionBid({
      startHeight,
      initialPrice,
      floorPrice,
      currentBlockHeight,
      decayRate,
      decayInterval,
    });

    if (submittedBid && submittedBid < requiredMinimumBid) {
      throw Error(
        `The bid (${submittedBid} IO) is less than the current required minimum bid of ${requiredMinimumBid} IO.`,
      );
    }

    // the bid is the minimum of what was submitted and what is actually needed
    const finalBid = submittedBid
      ? Math.min(submittedBid, requiredMinimumBid)
      : requiredMinimumBid;

    // throw an error if the wallet doesn't have the balance for the bid
    if (!walletHasSufficientBalance(balances, caller, finalBid)) {
      throw Error(DEFAULT_INVALID_QTY_MESSAGE);
    }

    /**
     * When a second bidder wins the bid, we can update the state completely to reflect the auction has been won.
     *
     * To do so we need to:
     * 1. Update the records
     * 2. Return the vault back to the initiator
     * 3. Decrement the balance of the secret bidder
     */

    // the bid has been won, update the records
    records[name] = {
      contractTxId: bidDetails.contractTxId,
      tier,
      type,
      // only include timestamp on lease
      ...(type === 'lease' ? { endTimestamp } : {}),
    };

    // return the vaulted balance back to the initiator
    const { wallet: initiator, qty } = vault;
    balances[initiator] += qty;
    // decrement the vaulted balance from the user
    balances[caller] -= finalBid;

    // delete the auction
    delete auctions[name];
    // update the state
    state.auctions = auctions;
    state.balances = balances;
    state.records = records;
    state.reserved = reserved;
    return { state };
  }

  // no current auction, create one and vault the balance from the user
  if (!auctions[name]) {
    const {
      id: auctionSettingsId,
      floorPriceMultiplier,
      startPriceMultiplier,
    } = currentAuctionSettings;
    const calculatedFloor = registrationFee * floorPriceMultiplier;
    const floorPrice = submittedBid
      ? Math.min(submittedBid, calculatedFloor)
      : calculatedFloor;
    const initialPrice = registrationFee * startPriceMultiplier;

    // throw an error on invalid balance
    if (!walletHasSufficientBalance(balances, caller, floorPrice)) {
      throw Error(DEFAULT_INVALID_QTY_MESSAGE);
    }

    // create the initial auction bid
    const initialAuctionBid = {
      auctionSettingsId,
      floorPrice,
      initialPrice,
      details: bidDetails,
      // TODO: potentially increment by 1?
      startHeight: currentBlockHeight,
      type,
      vault: {
        wallet: caller,
        qty: floorPrice,
      },
    };
    auctions[name] = initialAuctionBid;
    balances[caller] -= floorPrice;

    // update the state
    state.auctions = auctions;
    state.balances = balances;
    state.records = records;
    state.reserved = reserved;
    return { state };
  }
};
