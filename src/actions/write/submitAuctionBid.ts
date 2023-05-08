import {
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
} from '@/utilities.js';

import {
  DEFAULT_AUCTION_SETTINGS,
  RESERVED_ATOMIC_TX_ID,
} from '../../constants';
import {
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
  // TODO: we may need to default this value
  const currentAuctionSettings: AuctionSettings =
    settings.auctions.history.find((a) => a.id === settings.auctions.current) ??
    DEFAULT_AUCTION_SETTINGS;
  const formattedName = name.trim().toLowerCase();
  const bidDetails: AuctionBidDetails = {
    contractTxId: details.contractTxId ?? RESERVED_ATOMIC_TX_ID,
  };

  // validate name
  if (!formattedName) {
    throw ContractError('Name is required.');
  }

  if (Object.keys(formattedName).includes(formattedName)) {
    throw ContractError('Name is not available for auction');
  }

  // validate type
  if (!type || !auctionTypes.includes(type)) {
    throw ContractError('Invalid auction type.');
  }

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

    // update the state to include the auction
    state.auctions = auctions;
    return { state };
  } else {
    // no current auction, create one
    const initialAuctionBid = {
      auctionSettingsID: currentAuctionSettings.id,
      floorPrice: Math.max(
        qty,
        registrationFee * currentAuctionSettings.floorPriceMultiplier,
      ),
      initialPrice:
        registrationFee * currentAuctionSettings.startPriceMultiplier,
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
