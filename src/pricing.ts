import { DEMAND_FACTORING_SETTINGS, ONE_MIO } from './constants';
import {
  BlockHeight,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  IOState,
  IOToken,
} from './types';

export function tallyNamePurchase(
  dfData: DeepReadonly<DemandFactoringData>,
): DemandFactoringData {
  const newDfData = cloneDemandFactoringData(dfData);
  newDfData.purchasesThisPeriod++;
  return newDfData;
}

export function updateDemandFactor(
  currentHeight: BlockHeight,
  dfData: DeepReadonly<DemandFactoringData>,
  fees: DeepReadonly<Fees>,
): Pick<IOState, 'demandFactoring' | 'fees'> {
  if (!shouldUpdateDemandFactor(currentHeight, dfData)) {
    return {
      demandFactoring: dfData as DemandFactoringData,
      fees: fees as Fees,
    };
  }

  const newDemandFactoringData = cloneDemandFactoringData(dfData);
  let updatedFees: Fees | undefined;

  const numNamesPurchasedInLastPeriod = dfData.purchasesThisPeriod;
  const mvgAvgOfTrailingNamePurchases = mvgAvgTrailingPurchaseCounts(dfData);
  if (
    demandIsIncreasing({
      numNamesPurchasedInLastPeriod,
      mvgAvgOfTailingNamePurchases: mvgAvgOfTrailingNamePurchases,
    })
  ) {
    newDemandFactoringData.demandFactor *=
      1 + DEMAND_FACTORING_SETTINGS.demandFactorUpAdjustment;
  } else if (dfData.demandFactor > DEMAND_FACTORING_SETTINGS.demandFactorMin) {
    newDemandFactoringData.demandFactor *=
      1 - DEMAND_FACTORING_SETTINGS.demandFactorDownAdjustment;
  }

  // If necessary, reset the demand factor after enough consecutive periods at the minimum
  if (
    newDemandFactoringData.demandFactor ===
    DEMAND_FACTORING_SETTINGS.demandFactorMin
  ) {
    if (
      ++newDemandFactoringData.consecutivePeriodsWithMinDemandFactor >=
      DEMAND_FACTORING_SETTINGS.stepDownThreshold
    ) {
      newDemandFactoringData.consecutivePeriodsWithMinDemandFactor = 0;
      newDemandFactoringData.demandFactor =
        DEMAND_FACTORING_SETTINGS.demandFactorBaseValue;
      // Rebase fees on their values at the minimum demand factor
      updatedFees = Object.keys(fees).reduce(
        (acc: Fees, nameLength: string) => {
          acc[nameLength] = Math.max(
            fees[nameLength] * DEMAND_FACTORING_SETTINGS.demandFactorMin,
            ONE_MIO,
          );
          return acc;
        },
        {},
      );
    }
  } else {
    newDemandFactoringData.consecutivePeriodsWithMinDemandFactor = 0;
  }

  // Stash the number of purchases for this period in the trailing metrics
  newDemandFactoringData.trailingPeriodPurchases[
    demandFactorPeriodIndex(newDemandFactoringData.currentPeriod)
  ] = numNamesPurchasedInLastPeriod;

  // Increment the current period and reset the purchase count
  newDemandFactoringData.currentPeriod++;
  newDemandFactoringData.purchasesThisPeriod = 0;

  return {
    demandFactoring: newDemandFactoringData,
    fees: updatedFees || fees,
  };
}

export function shouldUpdateDemandFactor(
  currentHeight: BlockHeight,
  dfData: DeepReadonly<DemandFactoringData>,
): boolean {
  // Don't update the demand factor if we're still in the first-ever period
  if (currentHeight.valueOf() === dfData.periodZeroBlockHeight) {
    return false;
  }

  const currentPeriod = periodAtHeight(
    currentHeight,
    new BlockHeight(dfData.periodZeroBlockHeight),
  );
  return currentPeriod > dfData.currentPeriod;
}

export function demandIsIncreasing({
  numNamesPurchasedInLastPeriod,
  mvgAvgOfTailingNamePurchases,
}: {
  numNamesPurchasedInLastPeriod: number;
  mvgAvgOfTailingNamePurchases: number;
}): boolean {
  return (
    numNamesPurchasedInLastPeriod >= mvgAvgOfTailingNamePurchases &&
    numNamesPurchasedInLastPeriod !== 0
  );
}

export function periodAtHeight(
  height: BlockHeight,
  periodZeroHeight: BlockHeight,
): number {
  return Math.floor(
    (height.valueOf() - periodZeroHeight.valueOf()) /
      DEMAND_FACTORING_SETTINGS.periodBlockCount,
  );
}

export function demandFactorPeriodIndex(period: number): number {
  return period % DEMAND_FACTORING_SETTINGS.movingAvgPeriodCount;
}

export function mvgAvgTrailingPurchaseCounts(
  dfData: DeepReadonly<DemandFactoringData>,
): number {
  return (
    dfData.trailingPeriodPurchases.reduce(
      (acc, periodPurchaseCount) => acc + periodPurchaseCount,
      0,
    ) / DEMAND_FACTORING_SETTINGS.movingAvgPeriodCount
  );
}

export function cloneDemandFactoringData(
  dfData: DeepReadonly<DemandFactoringData>,
): DemandFactoringData {
  return {
    ...dfData,
    trailingPeriodPurchases: dfData.trailingPeriodPurchases.slice(),
  };
}

export function calculateMinimumAuctionBid({
  startHeight,
  startPrice,
  floorPrice,
  currentBlockHeight,
  decayInterval,
  decayRate,
}: {
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
  currentBlockHeight: BlockHeight;
  decayInterval: number;
  decayRate: number;
}): IOToken {
  const blockIntervalsPassed = Math.max(
    0,
    Math.floor(
      (currentBlockHeight.valueOf() - startHeight.valueOf()) / decayInterval,
    ),
  );
  const dutchAuctionBid =
    startPrice * Math.pow(1 - decayRate, blockIntervalsPassed);
  // TODO: we shouldn't be rounding like this, use a separate class to handle the number of allowed decimals for IO values and use them here
  return new IOToken(Math.max(floorPrice, dutchAuctionBid));
}
