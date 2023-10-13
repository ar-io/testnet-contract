import { NON_EXPIRED_ARNS_NAME_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { calculateRegistrationFee, getAuctionPrices } from '../../utilities';

declare const SmartWeave: any;
declare const ContractError;

export const getAuction = (
  state: IOState,
  { input: { name, type = 'lease' } }: PstAction,
): ContractResult => {
  const { records, auctions, settings, fees, reserved } = state;
  const auction = auctions[name.toLowerCase().trim()];

  if (!auction) {
    // get the current auction settings to create prices
    const auctionSettingsId = settings.auctions.current;
    const auctionSettings = settings.auctions.history.find(
      (a) => a.id === auctionSettingsId,
    );

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
        settings: {
          id: auctionSettingsId,
          ...auctionSettings,
        },
      },
    };
  }

  const { auctionSettingsId, startHeight, floorPrice, startPrice } = auction;
  const auctionSettings = settings.auctions.history.find(
    (a) => a.id === auctionSettingsId,
  );

  if (!auctionSettings) {
    throw new ContractError(
      `Auction settings with id ${auctionSettingsId} does not exist.`,
    );
  }

  const expirationHeight = startHeight + auctionSettings.auctionDuration;

  const prices = getAuctionPrices({
    auctionSettings,
    startHeight,
    startPrice,
    floorPrice,
  });

  return {
    result: {
      [name]: auction,
      endHeight: expirationHeight,
      isExpired: expirationHeight < +SmartWeave.block.height,
      isAvailableForAuction: false,
      settings: {
        id: auctionSettingsId,
        ...auctionSettings,
      },
      prices,
    },
  };
};
