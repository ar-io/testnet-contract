import { ContractResult, IOState, PstAction } from '../../types';
import { calculateMinimumAuctionBid } from '../../utilities';

declare const ContractError;

export const getAuction = (
  state: IOState,
  { input: { name } }: PstAction,
): ContractResult => {
  const { auctions, settings } = state;
  const auction = auctions[name.toLowerCase().trim()];

  if (!auction) {
    throw new ContractError(`No live auction exists for ${auction}`);
  }

  const {
    startHeight,
    endHeight,
    decayInterval,
    decayRate,
    floorPrice,
    startPrice,
  } = auction;
  const intervalCount = (startHeight - endHeight) / decayInterval;
  const prices = {};
  for (let i = 0; i <= intervalCount; i++) {
    const intervalHeight = startHeight + i * decayInterval;
    const price = calculateMinimumAuctionBid({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: intervalHeight,
      decayInterval,
      decayRate,
    });
    prices[intervalHeight] = price;
  }

  return {
    result: {
      auction: {
        ...auction,
        minimumBids: prices,
      },
    },
  };
};
