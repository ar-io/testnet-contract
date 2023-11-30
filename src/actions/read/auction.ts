import {
  calculateAuctionPriceForBlock,
  createAuctionObject,
  getAuctionPricesForInterval,
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
      currentBlockTimestamp,
      demandFactoring: state.demandFactoring,
      currentBlockHeight,
      contractTxId: '',
      initiator: '',
    });

    const prices = getAuctionPricesForInterval({
      auctionSettings,
      startHeight: currentBlockHeight, // set it to the current block height
      startPrice: auctionObject.startPrice,
      floorPrice: auctionObject.floorPrice,
      blocksPerInterval: 30, // TODO: this could be an input on the function
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
        currentPrice: auctionObject.floorPrice, // since its not active yet, the minimum bid is the floor price
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
  const prices = getAuctionPricesForInterval({
    auctionSettings: existingAuctionSettings,
    startHeight: new BlockHeight(startHeight),
    startPrice, // TODO: use IO class class
    floorPrice,
    blocksPerInterval: 30, // TODO: this could be an input on the function
  });

  // calculate the minimum bid
  const minimumBid = calculateAuctionPriceForBlock({
    startHeight: new BlockHeight(startHeight),
    startPrice,
    floorPrice,
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    scalingExponent: existingAuctionSettings.scalingExponent,
    exponentialDecayRate: existingAuctionSettings.exponentialDecayRate,
  });

  // TODO: return stringified function used to compute the current price of the auction so clients can calculate prices per block heights themselves

  return {
    result: {
      name: formattedName,
      isActive: expirationHeight >= +SmartWeave.block.height,
      isAvailableForAuction: false,
      isRequiredToBeAuctioned: isRequiredToBeAuctioned,
      currentPrice: minimumBid.valueOf(),
      ...auction,
      prices,
    },
  };
};
