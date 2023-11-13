import {
  calculateMinimumAuctionBid,
  getAuctionPricesForInterval,
  getEndTimestampForAuction,
} from './auctions';
import { SECONDS_IN_A_YEAR } from './constants';
import { AuctionData, BlockTimestamp } from './types';
import { BlockHeight } from './types';

describe('Auction util functions', () => {
  describe('calculateMinimumAuctionBid function', () => {
    it.each([
      // we keep the scalingComponent consistent to make it easier to reason about the test cases, and to represent the decay in the auction curve for block heights and varying decay rates
      [[0, 0, 0.001, 90], 100],
      [[0, 1, 0.001, 90], 91.389003],
      [[0, 2, 0.001, 90], 83.511968],
      [[0, 3, 0.001, 90], 76.306977],
      [[0, 0, 0.002, 90], 100],
      [[0, 1, 0.002, 90], 83.511968],
      [[0, 2, 0.002, 90], 69.717284],
      [[0, 3, 0.002, 90], 58.180118],
    ])(
      'given [current block height, moving average purchase count] of %j, should return %d',
      (
        [startHeight, currentHeight, exponentialDecayRate, scalingExponent],
        expectedPrice,
      ) => {
        const calculatedMinimumBid = calculateMinimumAuctionBid({
          startHeight: new BlockHeight(startHeight),
          startPrice: 100,
          floorPrice: 10,
          currentBlockHeight: new BlockHeight(currentHeight),
          exponentialDecayRate,
          scalingExponent,
        });
        expect(calculatedMinimumBid.valueOf()).toEqual(expectedPrice);
      },
    );
  });

  describe('getAuctionPricesForInterval function', () => {
    const baseAuctionSettings = {
      auctionDuration: 3,
      exponentialDecayRate: 0.001,
      scalingExponent: 90,
      floorPriceMultiplier: 1,
      startPriceMultiplier: 10,
    };

    it('should return the correct prices for all block heights', () => {
      const prices = getAuctionPricesForInterval({
        auctionSettings: baseAuctionSettings,
        startHeight: new BlockHeight(0),
        startPrice: 100,
        floorPrice: 10,
        blocksPerInterval: 1,
      });
      expect(prices).toEqual({
        0: 100,
        1: 91.389003,
        2: 83.511968,
        3: 76.306977,
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
        exponentialDecayRate: 0.1,
        scalingExponent: 90,
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
