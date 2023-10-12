import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
  getAuctionPrices,
} from '../../utilities';

declare const SmartWeave: any;

export const getAuction = (
  state: IOState,
  { input: { name, type = 'lease' } }: PstAction,
): ContractResult => {
  const { records, auctions, settings, fees, reserved } = state;
  const auction = auctions[name.toLowerCase().trim()];
  const auctionSettings = settings.auctions;

  if (!auction) {
    const { floorPriceMultiplier, startPriceMultiplier } = auctionSettings;

    const registrationFee =
      type === 'lease'
        ? calculateTotalRegistrationFee(
            name,
            fees,
            1,
            +SmartWeave.block.timestamp,
          )
        : calculatePermabuyFee(name, fees, +SmartWeave.block.timestamp);

    const floorPrice = registrationFee * floorPriceMultiplier;
    const startPrice = floorPrice * startPriceMultiplier;

    const prices = getAuctionPrices({
      auctionSettings,
      startHeight: 0, // set to zero to indicate that the auction has not started at a specific block
      startPrice,
      floorPrice,
    });

    return {
      result: {
        isExpired: false,
        // TODO: add expiration check for both
        isAvailableForAuction:
          !records[name.toLowerCase().trim()] &&
          !reserved[name.toLowerCase().trim()],
        type,
        name,
        prices,
        settings: auctionSettings,
      },
    };
  }

  const { startHeight, floorPrice, startPrice } = auction;
  const expirationHeight = startHeight + auctionSettings.auctionDuration;

  const prices = getAuctionPrices({
    auctionSettings,
    startHeight,
    startPrice,
    floorPrice,
  });

  return {
    result: {
      ...auction,
      endHeight: expirationHeight,
      isExpired: expirationHeight < +SmartWeave.block.height,
      isAvailableForAuction: false,
      prices,
    },
  };
};
