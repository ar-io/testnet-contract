import {
  calculateMinimumAuctionBid,
  cloneDemandFactoringData,
  demandFactorPeriodIndex,
  demandIsIncreasing,
  mvgAvgTrailingPurchaseCounts,
  periodAtHeight,
  shouldUpdateDemandFactor,
  tallyNamePurchase,
  updateDemandFactor,
} from '../src/pricing';
import { BlockHeight, DemandFactoringData, Fees } from '../src/types';

describe('Pricing functions:', () => {
  describe('periodAtHeight function', () => {
    it.each([
      [[0, 0], 0],
      [[1, 0], 0],
      [[719, 0], 0],
      [[720, 0], 1],
      [[721, 0], 1],
      [[1439, 0], 1],
      [[1440, 0], 2],
      [[101, 101], 0],
      [[102, 101], 0],
      [[820, 101], 0],
      [[821, 101], 1],
      [[1540, 101], 1],
      [[1541, 101], 2],
    ])(
      'given valid block height and height of zero-th period %j, should return the correct period %d',
      ([inputBlockHeight, inputPeriodZeroHeight], expectedOutputPeriod) => {
        expect(
          periodAtHeight(
            new BlockHeight(inputBlockHeight),
            new BlockHeight(inputPeriodZeroHeight),
          ),
        ).toEqual(expectedOutputPeriod);
      },
    );
  });

  describe('demandFactorPeriodIndex function', () => {
    it.each([
      [[0], 0],
      [[1], 1],
      [[6], 6],
      [[7], 0],
      [[8], 1],
      [[15], 1],
      [[16], 2],
    ])(
      'given valid period %j, should return the correct index %d',
      ([inputPeriod], expectedOutputIndex) => {
        expect(demandFactorPeriodIndex(inputPeriod)).toEqual(
          expectedOutputIndex,
        );
      },
    );
  });

  describe('tallyNamePurchase function', () => {
    it('should increment purchasesThisPeriod', () => {
      expect(
        tallyNamePurchase({
          periodZeroBlockHeight: 0,
          currentPeriod: 0,
          trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
          purchasesThisPeriod: 0,
          demandFactor: 1,
          consecutivePeriodsWithMinDemandFactor: 0,
        }),
      ).toEqual({
        periodZeroBlockHeight: 0,
        currentPeriod: 0,
        trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
        purchasesThisPeriod: 1,
        demandFactor: 1,
        consecutivePeriodsWithMinDemandFactor: 0,
      });
      expect(
        tallyNamePurchase({
          periodZeroBlockHeight: 0,
          currentPeriod: 6,
          trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
          purchasesThisPeriod: 0,
          demandFactor: 1,
          consecutivePeriodsWithMinDemandFactor: 0,
        }),
      ).toEqual({
        periodZeroBlockHeight: 0,
        currentPeriod: 6,
        trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
        purchasesThisPeriod: 1,
        demandFactor: 1,
        consecutivePeriodsWithMinDemandFactor: 0,
      });
      expect(
        tallyNamePurchase({
          periodZeroBlockHeight: 0,
          currentPeriod: 7,
          trailingPeriodPurchases: [1, 1, 1, 1, 1, 1, 1],
          purchasesThisPeriod: 1,
          demandFactor: 1.5,
          consecutivePeriodsWithMinDemandFactor: 3,
        }),
      ).toEqual({
        periodZeroBlockHeight: 0,
        currentPeriod: 7,
        trailingPeriodPurchases: [1, 1, 1, 1, 1, 1, 1],
        purchasesThisPeriod: 2,
        demandFactor: 1.5,
        consecutivePeriodsWithMinDemandFactor: 3,
      });
    });
  });

  describe('mvgAvgTrailingPurchaseCounts function', () => {
    it.each([
      [[[0, 0, 0, 0, 0, 0, 0]], 0],
      [[[0, 0, 0, 1, 0, 0, 0]], 1 / 7],
      [[[1, 1, 1, 1, 1, 1, 1]], 1],
      [
        [
          [
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
          ],
        ],
        Number.MAX_SAFE_INTEGER,
      ],
    ])(
      'given period purchase history %j, should return moving average %d',
      ([trailingPeriodPurchases], expectedMvgAvg) => {
        expect(
          mvgAvgTrailingPurchaseCounts({
            periodZeroBlockHeight: 0,
            currentPeriod: 0,
            trailingPeriodPurchases,
            purchasesThisPeriod: 10,
            demandFactor: 1,
            consecutivePeriodsWithMinDemandFactor: 0,
          }),
        ).toEqual(expectedMvgAvg);
      },
    );
  });

  describe('shouldUpdateDemandFactor function', () => {
    it.each([
      [[0, 0, 0], false],
      [[1, 0, 0], false],
      [[719, 0, 0], false],
      [[720, 0, 0], true],
      [[721, 1, 0], false],
      [[101, 0, 101], false],
      [[102, 0, 101], false],
      [[820, 0, 101], false],
      [[821, 0, 101], true],
      [[1540, 1, 101], false],
      [[1541, 1, 101], true],
    ])(
      'given valid block height, current period, and height of zero-th period %j, should return %d',
      (
        [currentHeight, currentPeriod, periodZeroBlockHeight],
        expectedResult,
      ) => {
        expect(
          shouldUpdateDemandFactor(new BlockHeight(currentHeight), {
            periodZeroBlockHeight,
            currentPeriod,
            trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
            purchasesThisPeriod: 10,
            demandFactor: 1,
            consecutivePeriodsWithMinDemandFactor: 0,
          }),
        ).toEqual(expectedResult);
      },
    );
  });

  describe('demandIsIncreasing function', () => {
    it.each([
      [[0, 0], false],
      [[0, 1], false],
      [[1, 1], true],
      [[2, 1], true],
    ])(
      'given [current period purchase count, moving average purchase count] of %j, should return %d',
      (
        [numNamesPurchasedInLastPeriod, mvgAvgOfTailingNamePurchases],
        expectedResult,
      ) => {
        expect(
          demandIsIncreasing({
            numNamesPurchasedInLastPeriod,
            mvgAvgOfTailingNamePurchases,
          }),
        ).toEqual(expectedResult);
      },
    );
  });

  describe('updateDemandFactor function', () => {
    const baselineDFData: DemandFactoringData = {
      periodZeroBlockHeight: 0,
      currentPeriod: 0,
      trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
      purchasesThisPeriod: 0,
      demandFactor: 1,
      consecutivePeriodsWithMinDemandFactor: 0,
    };
    const baselineFees: Fees = {
      '1': 1000,
      '2': 500,
    };

    it.each([
      [
        // Don't update the period or demand factoring data at block 0 of period 0 (special case)
        { currentBlock: 0, inputDfData: {} },
        { expectedDFOverrides: {} },
      ],
      [
        // Don't update the period or demand factoring data at first block of current period, but continue tracking ongoing purchases
        {
          currentBlock: 0,
          inputDfData: { purchasesThisPeriod: 1 },
        },
        {
          expectedDFOverrides: { purchasesThisPeriod: 1 },
        },
      ],
      [
        // Don't update the period or demand factoring data at final block of current period, but continue tracking ongoing purchases
        {
          currentBlock: 719,
          inputDfData: { purchasesThisPeriod: 1 },
        },
        {
          expectedDFOverrides: { purchasesThisPeriod: 1 },
        },
      ],
      [
        // Update the period and demand factoring data at first block of NEXT period
        {
          currentBlock: 720,
          inputDfData: { purchasesThisPeriod: 1 },
        },
        {
          expectedDFOverrides: {
            demandFactor: 1.05,
            currentPeriod: 1,
            trailingPeriodPurchases: [1, 0, 0, 0, 0, 0, 0],
          },
        },
      ],
      [
        // Don't update the period or demand factoring data at first block of CURRENT period, but continue tracking ongoing purchases
        {
          currentBlock: 720,
          inputDfData: {
            purchasesThisPeriod: 1,
            currentPeriod: 1,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 1,
            trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
            purchasesThisPeriod: 1,
          },
        },
      ],
      [
        // Don't update the period or demand factoring data at last block of current period, but continue tracking ongoing purchases
        {
          currentBlock: 1439,
          inputDfData: {
            purchasesThisPeriod: 2,
            currentPeriod: 1,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 1,
            trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
            purchasesThisPeriod: 2,
          },
        },
      ],
      [
        // Update the period and demand factoring data at first block of NEXT period
        {
          currentBlock: 1440,
          inputDfData: {
            purchasesThisPeriod: 5,
            trailingPeriodPurchases: [1, 2, 3, 4, 5, 6, 7],
            currentPeriod: 1,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 2,
            trailingPeriodPurchases: [1, 5, 3, 4, 5, 6, 7],
            demandFactor: 1.05,
          },
        },
      ],
      [
        // Demand factor reduces with low demand
        {
          currentBlock: 1440,
          inputDfData: {
            currentPeriod: 1,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 2,
            demandFactor: 0.95,
          },
        },
      ],
      [
        // Demand factor stays unchanged at minimum before unchanged-repeat threshold
        {
          currentBlock: 720,
          inputDfData: {
            demandFactor: 0.5,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 1,
            demandFactor: 0.5,
            consecutivePeriodsWithMinDemandFactor: 1,
          },
        },
      ],
      [
        // Demand factor resets after repeated low demand reaches repeat threshold
        {
          currentBlock: 2160,
          inputDfData: {
            demandFactor: 0.5,
            currentPeriod: 2,
            consecutivePeriodsWithMinDemandFactor: 2,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 3,
            demandFactor: 1,
          },
          expectedFeesOverrides: {
            '1': 500,
            '2': 250,
          },
        },
      ],
      [
        // Prices bottom out at 1 mIO during a demand factor reset
        {
          currentBlock: 2160,
          inputDfData: {
            demandFactor: 0.5,
            currentPeriod: 2,
            consecutivePeriodsWithMinDemandFactor: 2,
          },
          inputFees: {
            '1': 1 / 1_000_000,
            '2': 1 / 1_000_000,
          },
        },
        {
          expectedDFOverrides: {
            currentPeriod: 3,
            demandFactor: 1,
          },
          expectedFeesOverrides: {
            '1': 1 / 1_000_000,
            '2': 1 / 1_000_000,
          },
        },
      ],
    ])(
      'given [currentBlock, inputDfData] of %j, should return demand factoring data %d',
      (
        testData: {
          currentBlock: number;
          inputDfData: Partial<DemandFactoringData>;
          inputFees?: Fees;
        },
        {
          expectedDFOverrides,
          expectedFeesOverrides,
        }: {
          expectedDFOverrides: Partial<DemandFactoringData>;
          expectedFeesOverrides?: Fees;
        },
      ) => {
        const inputDfData: DemandFactoringData = {
          ...baselineDFData,
          ...testData.inputDfData,
        };
        const inputFees: Fees = {
          ...baselineFees,
          ...(testData.inputFees || {}),
        };
        const expectedDfData: DemandFactoringData = {
          ...baselineDFData,
          ...expectedDFOverrides,
        };
        const expectedFees: Fees = {
          ...baselineFees,
          ...(expectedFeesOverrides || {}),
        };
        const clonedInputDfData = cloneDemandFactoringData(inputDfData);
        expect(
          updateDemandFactor(
            new BlockHeight(testData.currentBlock),
            inputDfData,
            inputFees,
          ),
        ).toEqual({
          demandFactoring: expectedDfData,
          fees: expectedFees,
        });

        // Ensure input data remains unchanged (weak guarantee due to dependence on cloneDemandFactoringData)
        expect(inputDfData).toEqual(clonedInputDfData);
      },
    );
  });

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
