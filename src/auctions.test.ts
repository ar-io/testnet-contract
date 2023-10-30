import {
  calculateMinimumAuctionBid,
  getAuctionPrices,
  getEndTimestampForAuction,
} from './auctions';
import { SECONDS_IN_A_YEAR } from './constants';
import { AuctionData, BlockTimestamp } from './types';
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

  describe('getAuctionPrices function', () => {
    const baseAuctionSettings = {
      auctionDuration: 3,
      decayRate: 0.1,
      decayInterval: 1,
      floorPriceMultiplier: 1,
      startPriceMultiplier: 10,
    };

    it('should return the correct prices for all block heights', () => {
      const prices = getAuctionPrices({
        auctionSettings: baseAuctionSettings,
        startHeight: new BlockHeight(0),
        startPrice: 100,
        floorPrice: 10,
      });
      expect(prices).toEqual({
        0: 100,
        1: 90,
        2: 81,
        3: 72.9,
      });
    });
  });

  describe('getEndTimestampForAuction function', () => {
    const baselineAuctionData: AuctionData = {
      startHeight: 1,
      endHeight: 4,
      type: 'lease',
      startPrice: 100,
      floorPrice: 10,
      initiator: 'initiator',
      contractTxId: 'atomic',
      years: 1,
      settings: {
        auctionDuration: 3,
        decayRate: 0.1,
        decayInterval: 1,
        floorPriceMultiplier: 1,
        startPriceMultiplier: 10,
      },
    };

    it.each([
      [
        'should return the correct endTimestamp for a lease',
        {
          ...baselineAuctionData,
          type: 'lease',
        },
        1,
        new BlockTimestamp(SECONDS_IN_A_YEAR + 1),
      ],
      [
        'should return undefined for a permabuy',
        {
          ...baselineAuctionData,
          type: 'permabuy',
        },
        1,
        undefined,
      ],
    ])(
      '%s',
      (
        _,
        auctionData: AuctionData,
        currentTimestamp: number,
        expectedEndTimestamp: BlockTimestamp | undefined,
      ) => {
        const endTimestamp = getEndTimestampForAuction({
          auction: auctionData,
          currentBlockTimestamp: new BlockTimestamp(currentTimestamp),
        });
        expect(endTimestamp).toEqual(expectedEndTimestamp);
      },
    );
  });
});
