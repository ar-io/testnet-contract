import { demandFactorPeriodIndex, tallyNamePurchase } from '../src/pricing';
import { BlockHeight } from '../src/types';

describe('Pricing functions:', () => {
  describe('demandFactorPeriodIndex function', () => {
    it.each([
      [0, 0],
      [1, 0],
      [6, 0],
      [7, 0],
      [719, 0],
      [720, 1],
      [721, 1],
      [1439, 1],
      [1440, 2],
      [5039, 6],
      [5040, 0],
    ])(
      'given valid height %j, should return the correct index %d',
      (inputHeight, expectedOutput) => {
        expect(demandFactorPeriodIndex(new BlockHeight(inputHeight))).toEqual(
          expectedOutput,
        );
      },
    );
  });

  describe('tallyNamePurchase function', () => {
    it('should increment purchasesThisPeriod', () => {
      expect(
        tallyNamePurchase(new BlockHeight(0), {
          periodStartBlockHeight: 0,
          currentPeriod: 0,
          trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
          purchasesThisPeriod: 0,
          demandFactor: 1,
          consecutivePeriodsWithMinDemandFactor: 0,
        }),
      ).toEqual({
        periodStartBlockHeight: 0,
        currentPeriod: 0,
        trailingPeriodPurchases: [1, 0, 0, 0, 0, 0, 0],
        purchasesThisPeriod: 1,
        demandFactor: 1,
        consecutivePeriodsWithMinDemandFactor: 0,
      });
      expect(
        tallyNamePurchase(new BlockHeight(5039), {
          periodStartBlockHeight: 4320,
          currentPeriod: 6,
          trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
          purchasesThisPeriod: 0,
          demandFactor: 1,
          consecutivePeriodsWithMinDemandFactor: 0,
        }),
      ).toEqual({
        periodStartBlockHeight: 4320,
        currentPeriod: 6,
        trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 1],
        purchasesThisPeriod: 1,
        demandFactor: 1,
        consecutivePeriodsWithMinDemandFactor: 0,
      });
      expect(
        tallyNamePurchase(new BlockHeight(5040), {
          periodStartBlockHeight: 5040,
          currentPeriod: 7,
          trailingPeriodPurchases: [0, 1, 1, 1, 1, 1, 1],
          purchasesThisPeriod: 0,
          demandFactor: 1.5,
          consecutivePeriodsWithMinDemandFactor: 3,
        }),
      ).toEqual({
        periodStartBlockHeight: 5040,
        currentPeriod: 7,
        trailingPeriodPurchases: [1, 1, 1, 1, 1, 1, 1],
        purchasesThisPeriod: 1,
        demandFactor: 1.5,
        consecutivePeriodsWithMinDemandFactor: 3,
      });
    });

    it('should increment trailingPeriodPurchases', () => {
      // TODO
    });
  });
});
