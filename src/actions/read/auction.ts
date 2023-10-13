import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateRegistrationFee,
  getAuctionPrices,
  isNameAvailableForAuction,
  isNameRequiredToBeAuction,
} from '../../utilities';

declare const SmartWeave: any;

export const getAuction = (
  state: IOState,
  { caller, input: { name, type = 'lease' } }: PstAction,
): ContractResult => {
  const { records, auctions, settings, fees, reserved } = state;
  const formattedName = name.toLowerCase().trim();
  const auction = auctions[formattedName];
  const auctionSettings = settings.auctions;

  if (!auction) {
    const { floorPriceMultiplier, startPriceMultiplier } = auctionSettings;

    const registrationFee = calculateRegistrationFee({
      type,
      name,
      fees,
      years: 1,
      currentBlockTimestamp: +SmartWeave.block.timestamp,
    });

    const floorPrice = registrationFee * floorPriceMultiplier;
    const startPrice = floorPrice * startPriceMultiplier;

    const prices = getAuctionPrices({
      auctionSettings,
      startHeight: +SmartWeave.block.height, // set it to the current blockheight
      startPrice,
      floorPrice,
    });

    const currentBlockTimestamp = +SmartWeave.block.timestamp;

    // existing record
    const record = records[formattedName];

    // reserved name
    const reservedName = reserved[formattedName];

    // check if name is available for auction
    const isAvailableForAuction = isNameAvailableForAuction({
      caller,
      name: formattedName,
      record,
      reservedName,
      currentBlockTimestamp,
    });

    // some names must be auctioned depending on the type
    const isRequiredToBeAuctioned = isNameRequiredToBeAuction({
      name: formattedName,
      type,
    });

    return {
      result: {
        name,
        isActive: false,
        type,
        isAvailableForAuction: isAvailableForAuction,
        isRequiredToBeAuctioned: isRequiredToBeAuctioned,
        minimumBid: floorPrice, // since its not active yet, the minimum bid is the floor price
        endHeight: +SmartWeave.block.height + auctionSettings.auctionDuration,
        prices,
        settings: auctionSettings,
      },
    };
  }

  const { startHeight, floorPrice, startPrice } = auction;
  const expirationHeight = startHeight + auctionSettings.auctionDuration;
  const isRequiredToBeAuctioned = isNameRequiredToBeAuction({
    name: formattedName,
    type: auction.type,
  });

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
      // TODO: inclusive or exclusive here
      isActive: expirationHeight > +SmartWeave.block.height,
      isAvailableForAuction: false,
      isRequiredToBeAuctioned: isRequiredToBeAuctioned,
      prices,
    },
  };
};
