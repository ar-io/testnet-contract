import {
  calculateAuctionPriceForBlock,
  getAuctionPricesForInterval,
  getEndTimestampForAuction,
} from './auctions';
import { AUCTION_SETTINGS, SECONDS_IN_A_YEAR } from './constants';
import { ArNSAuctionData, ArNSBaseAuctionData, BlockTimestamp } from './types';
import { BlockHeight } from './types';

describe('calculateAuctionPriceForBlock', () => {
  describe('validate AUCTION_SETTINGS used in the contract', () => {
    const basePrice = 30;
    const allowedThreshold = 0.05; // prices must be within 5% of the expected value
    const startPrice = basePrice * AUCTION_SETTINGS.startPriceMultiplier;
    const floorPrice = basePrice * AUCTION_SETTINGS.floorPriceMultiplier;
    const startHeight = new BlockHeight(0);

    it.each([
      [
        'should never be larger than the start price',
        new BlockHeight(0),
        startPrice,
      ],
      [
        'should be half the start price after ~2.5 days (1800 blocks)',
        new BlockHeight(1800),
        startPrice / 2,
      ],
      [
        'should twice the floor price after ~11.5 days (8300 blocks)',
        new BlockHeight(8300),
        floorPrice * 2,
      ],
      [
        'should end at a price larger than the floor price',
        new BlockHeight(AUCTION_SETTINGS.auctionDuration),
        floorPrice,
      ],
    ])('%s', (_: string, currentBlockHeight: BlockHeight, expectedPrice) => {
      const priceAtBlock = calculateAuctionPriceForBlock({
        startHeight,
        startPrice,
        floorPrice,
        currentBlockHeight,
      });
      const percentDifference = Math.abs(
        1 - expectedPrice / priceAtBlock.valueOf(),
      );
      expect(priceAtBlock.valueOf()).toBeGreaterThanOrEqual(expectedPrice);
      expect(percentDifference).toBeLessThanOrEqual(allowedThreshold);
    });

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
      // block heights before the start height should just return the start price
      [[10, 9, 0.001, 90], 100],
      [[10, 0, 0.001, 90], 100],
    ])(
      'given [current block height, moving average purchase count] of %j, should return %d',
      ([startHeight, currentHeight], expectedPrice) => {
        const calculatedMinimumBid = calculateAuctionPriceForBlock({
          startHeight: new BlockHeight(startHeight),
          startPrice: 100,
          floorPrice: 10,
          currentBlockHeight: new BlockHeight(currentHeight),
        });
        expect(calculatedMinimumBid.valueOf()).toEqual(expectedPrice);
      },
    );
  });

  describe('getAuctionPricesForInterval function', () => {
    it('should return the correct prices for all block heights', () => {
      const prices = getAuctionPricesForInterval({
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
    const baselineAuctionData: ArNSBaseAuctionData = {
      startHeight: 1,
      endHeight: 4,
      type: 'lease',
      startPrice: 100,
      floorPrice: 10,
      initiator: 'initiator',
      contractTxId: 'atomic',
    };

    it.each([
      [
        'should return the correct endTimestamp for a lease',
        {
          ...baselineAuctionData,
          type: 'lease',
          years: 1,
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
        auctionData: ArNSAuctionData,
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
