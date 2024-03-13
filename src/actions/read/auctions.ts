import {
  calculateAuctionPriceForBlock,
  createAuctionObject,
  getAuctionPricesForInterval,
  isNameAvailableForAuction,
  isNameRequiredToBeAuction,
} from '../../auctions';
import { AUCTION_SETTINGS } from '../../constants';
import {
  BlockHeight,
  BlockTimestamp,
  ContractReadResult,
  DeepReadonly,
  IOState,
  PstAction,
  mIOToken,
} from '../../types';

export const getAuction = (
  state: DeepReadonly<IOState>,
  { caller, input: { name, type = 'lease' } }: PstAction,
): ContractReadResult => {
  const { records, auctions, fees, reserved } = state;
  const formattedName = name.toLowerCase().trim();
  const auction = auctions[formattedName];

  if (!auction) {
    const currentBlockTimestamp = new BlockTimestamp(
      +SmartWeave.block.timestamp,
    );
    const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

    // a stubbed auction object
    const auctionObject = createAuctionObject({
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
      startHeight: currentBlockHeight, // set it to the current block height
      startPrice: auctionObject.startPrice,
      floorPrice: auctionObject.floorPrice,
      blocksPerInterval: 30, // TODO: this could be an input on the function
      auctionSettings: AUCTION_SETTINGS,
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
        ...auctionObject,
        isActive: false,
        isAvailableForAuction: isAvailableForAuction,
        isRequiredToBeAuctioned: isRequiredToBeAuctioned,
        startPrice: auctionObject.startPrice.valueOf(),
        floorPrice: auctionObject.floorPrice.valueOf(),
        startHeight: auctionObject.startHeight.valueOf(),
        endHeight: auctionObject.endHeight.valueOf(),
        currentPrice: auctionObject.floorPrice.valueOf(), // since its not active yet, the minimum bid is the floor price
        prices,
      },
    };
  }

  const { startHeight, floorPrice, startPrice } = auction;
  // TODO: add auction end height to auction object
  const expirationHeight = startHeight + AUCTION_SETTINGS.auctionDuration;
  const isRequiredToBeAuctioned = isNameRequiredToBeAuction({
    name: formattedName,
    type: auction.type,
  });

  // get all the prices for the auction
  const prices = getAuctionPricesForInterval({
    startHeight: new BlockHeight(startHeight),
    startPrice: new mIOToken(startPrice),
    floorPrice: new mIOToken(floorPrice),
    blocksPerInterval: 30, // TODO: this could be an input on the function
    auctionSettings: AUCTION_SETTINGS,
  });

  // calculate the minimum bid
  const minimumBid = calculateAuctionPriceForBlock({
    startHeight: new BlockHeight(startHeight),
    startPrice: new mIOToken(startPrice),
    floorPrice: new mIOToken(floorPrice),
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    auctionSettings: AUCTION_SETTINGS,
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
