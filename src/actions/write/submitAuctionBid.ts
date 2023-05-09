import {
  calculateMinimumAuctionBid,
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
} from '@/utilities.js';

import {
  DEFAULT_AUCTION_SETTINGS,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_PERMABUY_EXPIRATION,
  DEFAULT_PERMABUY_TIER,
  DEFAULT_TIERS,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import {
  Auction,
  AuctionBidDetails,
  AuctionSettings,
  ContractResult,
  IOState,
  PstAction,
  ServiceTier,
  SubmitBidPayload,
  auctionTypes,
} from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Signals an approval for a proposed foundation action
export const submitAuctionBid = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { name, qty, type, details } = input as SubmitBidPayload;
  const { auctions, fees, records, tiers, settings } = state;
  const formattedName = name.trim().toLowerCase();

  // validate name
  if (!name) {
    throw ContractError('Name is required.');
  }

  // already an owned name
  if (Object.keys(records).includes(formattedName)) {
    throw ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  // validate type
  if (!type || !auctionTypes.includes(type)) {
    throw ContractError('Invalid auction type.');
  }
  
  // get the current auction settings, create one of it doesn't exist yet
  let currentAuctionSettings: AuctionSettings = settings.auctions.history.find((a) => a.id === settings.auctions.current)
  if(!currentAuctionSettings){
    const newAuctionSetting = {
      id: +SmartWeave.transaction.id,
      ...DEFAULT_AUCTION_SETTINGS
    }
    settings.auctions.history.push(newAuctionSetting);
    settings.auctions.current = newAuctionSetting.id;
    currentAuctionSettings = newAuctionSetting;
  }

  const currentTiers =
    state.tiers?.current ??
    DEFAULT_TIERS.reduce(
      (acc, tier, index) => ({
        ...acc,
        [index + 1]: tier.id,
      }),
      {},
    );

  const bidDetails: AuctionBidDetails = {
    contractTxId: details.contractTxId ?? RESERVED_ATOMIC_TX_ID,
  };

  let registrationFee;

  /**
   * When lease, set years and tier based on inputs or default to 1.
   */
  if (type === 'lease') {
    const tierNumber = details.tierNumber ?? 1;
    const years = details.years ?? 1;
    bidDetails.years = years;
    bidDetails.tierNumber = tierNumber;

    const serviceTier: ServiceTier = tiers?.history.find(
      (t) => t.id === tiers?.current[tierNumber],
    );
    registrationFee = calculateTotalRegistrationFee(
      formattedName,
      fees,
      serviceTier,
      years,
    );
  }

  if (type === 'permabuy') {
    registrationFee = calculatePermabuyFee(
      formattedName,
      fees,
      settings.permabuy.multiplier,
    );
  }

  // validate if no current auction
  if (Object.keys(auctions).includes(formattedName)) {
    // it's a pending auction, so validate it's a decent bid and update state
    const existingAuction: Auction = state.auctions[formattedName];
    const { startHeight, initialPrice, floorPrice } = existingAuction;
    const { decayInterval, decayRate }= currentAuctionSettings;
    const requiredMinimumBid = calculateMinimumAuctionBid({
      startHeight,
      initialPrice,
      floorPrice,
      currentBlockHeight: +SmartWeave.block.height,
      decayRate, 
      decayInterval, 
    })

    if(qty < requiredMinimumBid){
      throw Error(`The bid (${qty} IO) is less than the current required minimum bid of ${requiredMinimumBid} IO.`)
    }

    const endTimestamp = existingAuction.type === 'lease' ? +SmartWeave.block.height + SECONDS_IN_A_YEAR * bidDetails.years: DEFAULT_PERMABUY_EXPIRATION;
    const tierNumber = existingAuction.type === 'lease' ? existingAuction.details.tierNumber : DEFAULT_PERMABUY_TIER;
    // the bid has been won, update the records
    records[formattedName] = {
      contractTxId: bidDetails.contractTxId,
      type: existingAuction.type,
      endTimestamp: endTimestamp,
      tier: currentTiers[tierNumber]
    }

    delete auctions[formattedName];
    state.auctions = auctions;
    state.records = records;
    return { state };
  } else {
    const { id: auctionSettingsID, floorPriceMultiplier, startPriceMultiplier } = currentAuctionSettings;
    // no current auction, create one
    const initialAuctionBid = {
      auctionSettingsID,
      floorPrice: Math.max(
        qty,
        registrationFee * floorPriceMultiplier,
      ),
      initialPrice:
        registrationFee * startPriceMultiplier,
      initiator: caller,
      details: bidDetails,
      // TODO: potentially increment by 1?
      startHeight: +SmartWeave.block.height,
      type,
    };

    auctions[formattedName] = initialAuctionBid;

    // update the state to include the auction
    state.auctions = auctions;
    return { state };
  }
};
