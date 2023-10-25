import { calculateMinimumAuctionBid } from './auctions';
import { BlockHeight } from './types';

describe('Auction util functions', () => {
  describe('calculateMinimumAuctionBid function', () => {
    it.each([
      [[0, 0, 0.1], 100],
      [[0, 1, 0.1], 90],
      [[0, 2, 0.1], 81],
      [[0, 3, 0.1], 72.9],
      [[0, 0, 0.2], 100],
      [[0, 1, 0.2], 80],
      [[0, 2, 0.2], 64],
      [[0, 3, 0.2], 51.2],
    ])(
      'given [current block height, moving average purchase count] of %j, should return %d',
      ([startHeight, currentHeight, decayRate], expectedMinimumBid) => {
        const calculatedMinimumBid = calculateMinimumAuctionBid({
          startHeight: new BlockHeight(startHeight),
          startPrice: 100,
          floorPrice: 10,
          currentBlockHeight: new BlockHeight(currentHeight),
          decayRate: decayRate, // 10% per interval
          decayInterval: 1,
        });
        expect(calculatedMinimumBid.valueOf()).toEqual(expectedMinimumBid);
      },
    );
  });
});
