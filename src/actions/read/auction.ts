import {
  calculateMinimumAuctionBid,
  createAuctionObject,
  getAuctionPrices,
} from '../../auctions';
import {
  BlockHeight,
  BlockTimestamp,
  ContractReadResult,
  DeepReadonly,
  IOState,
  PstAction,
} from '../../types';
import {
  isNameAvailableForAuction,
  isNameRequiredToBeAuction,
} from '../../utilities';

export const getAuction = (
  state: DeepReadonly<IOState>,
  { caller, input: { name, type = 'lease' } }: PstAction,
): ContractReadResult => {
  const { records, auctions, settings, fees, reserved } = state;
  const formattedName = name.toLowerCase().trim();
  const auction = auctions[formattedName];

  if (!auction) {
    const auctionSettings = settings.auctions;
    const currentBlockTimestamp = new BlockTimestamp(
      +SmartWeave.block.timestamp,
    );
    const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

    // a stubbed auction object
    const auctionObject = createAuctionObject({
      auctionSettings,
      type,
      name,
      fees,
      years: 1,
      currentBlockTimestamp,
      demandFactoring: state.demandFactoring,
      currentBlockHeight,
      contractTxId: undefined,
      initiator: undefined,
    });

    const prices = getAuctionPrices({
      auctionSettings,
      startHeight: currentBlockHeight, // set it to the current block height
      startPrice: auctionObject.startPrice,
      floorPrice: auctionObject.floorPrice,
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

    return {
      result: {
        name: formattedName,
        isActive: false,
        isAvailableForAuction: isAvailableForAuction,
        isRequiredToBeAuctioned: isRequiredToBeAuctioned,
        minimumBid: auctionObject.floorPrice, // since its not active yet, the minimum bid is the floor price
        ...auctionObject,
        prices,
      },
    };
  }

  const {
    startHeight,
    floorPrice,
    startPrice,
    settings: existingAuctionSettings,
  } = auction;
  const expirationHeight =
    startHeight + existingAuctionSettings.auctionDuration;
  const isRequiredToBeAuctioned = isNameRequiredToBeAuction({
    name: formattedName,
    type: auction.type,
  });

  // get all the prices for the auction
  const prices = getAuctionPrices({
    auctionSettings: existingAuctionSettings,
    startHeight: new BlockHeight(startHeight),
    startPrice, // TODO: use IO class class
    floorPrice,
  });

  // calculate the minimum bid
  const minimumBid = calculateMinimumAuctionBid({
    startHeight: new BlockHeight(startHeight),
    startPrice,
    floorPrice,
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    decayInterval: existingAuctionSettings.decayInterval,
    decayRate: existingAuctionSettings.decayRate,
  });

  return {
    result: {
      name: formattedName,
      isActive: expirationHeight > +SmartWeave.block.height,
      isAvailableForAuction: false,
      isRequiredToBeAuctioned: isRequiredToBeAuctioned,
      minimumBid: minimumBid.valueOf(),
      ...auction,
      prices,
    },
  };
};
