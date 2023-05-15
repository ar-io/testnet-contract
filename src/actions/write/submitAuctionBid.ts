import {
  calculateMinimumAuctionBid,
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
} from '../../utilities';

import {
  DEFAULT_INVALID_QTY_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_PERMABUY_EXPIRATION,
  DEFAULT_PERMABUY_TIER,
  INVALID_INPUT_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import {
  AuctionSettings,
  ContractResult,
  IOState,
  PstAction,
  ServiceTier,
} from '../../types';
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
    tierNumber: number;
    years: number;
  };
  constructor(input: any) {
    // validate using ajv validator
    if (!validateAuctionBid(input)) {
      throw new ContractError(INVALID_INPUT_MESSAGE);
    }

    const { name, qty, type, details } = input;
    this.name = name.trim().toLowerCase();
    this.qty = qty;
    this.type = type ?? 'lease';
    this.details = {
      contractTxId: details.contractTxId,
      years:
        this.type === 'lease'
          ? details.years ?? 1
          : DEFAULT_PERMABUY_EXPIRATION,
      tierNumber:
        this.type === 'lease' ? details.tierNumber ?? 1 : DEFAULT_PERMABUY_TIER, // the top tier
    };
  }
}

// Signals an approval for a proposed foundation action
export const submitAuctionBid = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { auctions = {}, fees, records, tiers, settings, balances, vaults } = state;

  // does validation on constructor
  const {
    name,
    qty: submittedBid,
    type,
    details: bidDetails,
  } = new AuctionBid(input);

  // already an owned name
  if (Object.keys(records).includes(name)) {
    throw ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  // get the current auction settings, create one of it doesn't exist yet
  const currentAuctionSettings: AuctionSettings =
    settings.auctions.history.find((a) => a.id === settings.auctions.current);

  if (!currentAuctionSettings) {
    throw Error('No auctions settings found.');
  }

  // validate we have tiers
  const currentTiers = tiers?.current;
  const tierHistory = tiers?.history;

  if (!currentTiers || !tierHistory.length) {
    throw Error('No tiers found.');
  }

  // all the things we need to handle an auction bid
  const currentBlockHeight = +SmartWeave.block.height;
  const { decayInterval, decayRate, auctionDuration } = currentAuctionSettings;

  // calculate the standard registration fee
  const serviceTier = tierHistory.find(
    (t: ServiceTier) => t.id === currentTiers[bidDetails.tierNumber - 1],
  );
  const registrationFee =
    type === 'lease'
      ? calculateTotalRegistrationFee(name, fees, serviceTier, bidDetails.years)
      : calculatePermabuyFee(name, fees, settings.permabuy.multiplier);

  // current auction in the state, validate the bid and update state
  if (Object.keys(auctions).includes(name)) {
    const existingAuction = auctions[name];
    const { startHeight, initialPrice, floorPrice, vault } = existingAuction;
    const auctionEndHeight = startHeight + auctionDuration;
    const endTimestamp =
      +SmartWeave.block.height + SECONDS_IN_A_YEAR * bidDetails.years; // 0 for permabuy
    const tier = currentTiers[existingAuction.details.tierNumber - 1];
    const type = existingAuction.type;
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
        endTimestamp,
        type,
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
      endTimestamp,
      tier,
      type,
    };

    // return the vaulted balance back to the initiator
    const { wallet: initiator, qty } = vault;
    balances[initiator] += qty;
    // decrement the vaulted balance from the user
    balances[caller] -= finalBid;

    // delete the auction
    delete auctions[name];
    state.auctions = auctions;
    state.records = records;
    state.balances = balances;
    return { state };
  }

  // no current auction, create one and vault the balance from the user
  if (!Object.keys(auctions).includes(name)) {
    const {
      id: auctionSettingsId,
      floorPriceMultiplier,
      startPriceMultiplier,
    } = currentAuctionSettings;
    const calculatedFloor = registrationFee * floorPriceMultiplier;
    const floorPrice = submittedBid
      ? Math.max(submittedBid, calculatedFloor)
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

    // update the state to include the auction, notice not records have been updated
    state.auctions = auctions;
    state.vaults = vaults;
    state.balances = balances;
    return { state };
  }
};


export function walletHasSufficientBalance(
  balances: { [x: string]: number },
  wallet: string,
  qty: number,
): boolean {
  return balances[wallet] && balances[wallet] >= qty;
}
