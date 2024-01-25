import {
  calculateAuctionPriceForBlock,
  calculateExistingAuctionBidForCaller,
  getAuctionPricesForInterval,
  getEndTimestampForAuction,
} from './auctions';
import { AUCTION_SETTINGS, SECONDS_IN_A_YEAR } from './constants';
import {
  ArNSAuctionData,
  ArNSBaseAuctionData,
  ArNSLeaseAuctionData,
  BlockTimestamp,
  IOToken,
} from './types';
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
      [[0, 0], 100],
      [[0, 1], 99.962007],
      [[0, 2], 99.924029],
      [[0, 3], 99.886065],
      [[0, 1], 99.962007],
      [[0, 2], 99.924029],
      [[0, 3], 99.886065],
      // block heights before the start should just return the start price
      [[10, 9], 100],
      [[10, 0], 100],
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

      expect(Object.keys(prices).length).toEqual(10081);
      expect(prices[0]).toEqual(100);
      expect(prices[1000]).toEqual(68.360124);
      expect(prices[2000]).toEqual(46.695422);
      expect(prices[3000]).toEqual(31.872273);
      expect(prices[4000]).toEqual(21.737906);
      expect(prices[5000]).toEqual(14.814499);
      expect(prices[6000]).toEqual(10.088334);
      expect(prices[7000]).toEqual(10);
      expect(prices[8000]).toEqual(10);
      expect(prices[9000]).toEqual(10);
      expect(prices[10080]).toEqual(10);
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

describe('calculateExistingAuctionBidForCaller function', () => {
  const nihilisticAuction: ArNSLeaseAuctionData = {
    startPrice: Number.NEGATIVE_INFINITY,
    floorPrice: Number.NEGATIVE_INFINITY,
    startHeight: Number.NEGATIVE_INFINITY,
    endHeight: Number.NEGATIVE_INFINITY,
    type: 'lease',
    initiator: '',
    contractTxId: '',
    years: 1,
  };

  it('should throw if submitted bid is less than the required minimum bid', () => {
    expect(() => {
      calculateExistingAuctionBidForCaller({
        caller: '',
        auction: nihilisticAuction,
        submittedBid: 1,
        requiredMinimumBid: new IOToken(2),
      });
    }).toThrowError(
      'The bid (1 IO) is less than the current required minimum bid of 2 IO.',
    );
  });
});
