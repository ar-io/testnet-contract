import {
  MINIMUM_ALLOWED_NAME_LENGTH,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { calculateRegistrationFee, getAuctionPrices } from '../../utilities';

declare const SmartWeave: any;

export const getAuction = (
  state: IOState,
  { input: { name, type = 'lease' } }: PstAction,
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

    // TODO: check record and reserved name expirations
    const record = records[formattedName];
    // add grace period
    const isExistingActiveRecord =
      record &&
      record.endTimestamp &&
      record.endTimestamp > +SmartWeave.block.timestamp;

    const reservedName = reserved[formattedName];

    // TODO: move to util function
    const isActiveReservedName =
      reservedName &&
      reservedName.endTimestamp &&
      reservedName.endTimestamp > +SmartWeave.block.timestamp;

    // TODO: move to util function
    const isShortNameRestricted =
      formattedName.length < MINIMUM_ALLOWED_NAME_LENGTH &&
      SmartWeave.block.timestamp < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP;

    // TODO: move to util function
    const isAvailableForAuction =
      !isExistingActiveRecord &&
      !isActiveReservedName &&
      !isShortNameRestricted;

    // TODO: move to util function
    const isRequiredToBeAuctioned =
      type == 'permabuy' && formattedName.length < 12;

    return {
      result: {
        name,
        isActive: false,
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
      isRequiredToBeAuctioned: prices,
    },
  };
};
