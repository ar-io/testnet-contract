import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateMinimumAuctionBid,
  calculateRegistrationFee,
  createAuctionObject,
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
    const currentBlockTimestamp = +SmartWeave.block.timestamp;
    const currentBlockHeight = +SmartWeave.block.height;

    const initialRegistrationFee = calculateRegistrationFee({
      type,
      name,
      fees,
      years: 1,
      currentBlockTimestamp,
    });

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

    // a stubbed auction object
    const auctionObject = createAuctionObject({
      auctionSettings,
      type,
      initialRegistrationFee: initialRegistrationFee,
      currentBlockHeight,
      contractTxId: undefined,
      initiator: undefined,
    });

    const floorPrice =
      initialRegistrationFee * auctionObject.settings.floorPriceMultiplier;
    const startPrice = floorPrice * auctionObject.settings.startPriceMultiplier;

    const prices = getAuctionPrices({
      auctionSettings,
      startHeight: currentBlockHeight, // set it to the current block height
      startPrice,
      floorPrice,
    });

    return {
      result: {
        name: formattedName,
        isActive: false,
        isAvailableForAuction: isAvailableForAuction,
        isRequiredToBeAuctioned: isRequiredToBeAuctioned,
        minimumBid: floorPrice, // since its not active yet, the minimum bid is the floor price
        ...auctionObject,
        prices,
      },
    };
  }

  const { startHeight, floorPrice, startPrice } = auction;
  const expirationHeight = startHeight + auctionSettings.auctionDuration;
  const isRequiredToBeAuctioned = isNameRequiredToBeAuction({
    name: formattedName,
    type: auction.type,
  });

  // get all the prices for the auction
  const prices = getAuctionPrices({
    auctionSettings,
    startHeight,
    startPrice,
    floorPrice,
  });

  // calculate the minimum bid
  const minimumBid = calculateMinimumAuctionBid({
    startHeight,
    startPrice,
    floorPrice,
    currentBlockHeight: +SmartWeave.block.height,
    decayInterval: auctionSettings.decayInterval,
    decayRate: auctionSettings.decayRate,
  });

  return {
    result: {
      name: formattedName,
      // TODO: inclusive or exclusive here
      isActive: expirationHeight > +SmartWeave.block.height,
      isAvailableForAuction: false,
      isRequiredToBeAuctioned: isRequiredToBeAuctioned,
      minimumBid,
      ...auction,
      prices,
    },
  };
};
