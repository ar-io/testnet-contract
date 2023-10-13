import { DEMAND_FACTORING_SETTINGS } from './constants';
import {
  BlockHeight,
  DeepReadonly,
  DemandFactoringData,
  IOState,
} from './types';

export function tallyNamePurchase(
  dfData: DeepReadonly<DemandFactoringData>,
): DemandFactoringData {
  const newDfData = {
    ...dfData,
    trailingPeriodPurchases: dfData.trailingPeriodPurchases.slice(),
  };
  newDfData.purchasesThisPeriod++;
  return newDfData;
}

// TODO: Pure input output?
export function updateDemandFactor(
  currentHeight: BlockHeight,
  state: IOState,
): IOState {
  if (shouldUpdateDemandFactor(currentHeight, state)) {
    const numNamesPurchasedInLastPeriod =
      state.demandFactoring.purchasesThisPeriod;
    const mvgAvgOfTrailingNamePurchases = mvgAvgTrailingPurchaseCounts(
      state.demandFactoring,
    );
    if (
      demandIsIncreasing({
        numNamesPurchasedInLastPeriod,
        mvgAvgOfTailingNamePurchases: mvgAvgOfTrailingNamePurchases,
      })
    ) {
      state.demandFactoring.demandFactor *=
        1 + DEMAND_FACTORING_SETTINGS.demandFactorUpAdjustment;
    } else if (
      state.demandFactoring.demandFactor >
      DEMAND_FACTORING_SETTINGS.demandFactorMin
    ) {
      state.demandFactoring.demandFactor *=
        1 - DEMAND_FACTORING_SETTINGS.demandFactorDownAdjustment;
    }

    // If necessary, reset the demand factor after enough consecutive periods at the minimum
    if (
      state.demandFactoring.demandFactor ===
      DEMAND_FACTORING_SETTINGS.demandFactorMin
    ) {
      state.demandFactoring.consecutivePeriodsWithMinDemandFactor++;
    } else {
      state.demandFactoring.consecutivePeriodsWithMinDemandFactor = 0;
    }
    if (
      state.demandFactoring.consecutivePeriodsWithMinDemandFactor >=
      DEMAND_FACTORING_SETTINGS.stepDownThreshold
    ) {
      state.demandFactoring.consecutivePeriodsWithMinDemandFactor = 0;
      state.demandFactoring.demandFactor =
        DEMAND_FACTORING_SETTINGS.demandFactorBaseValue;
    }

    // Stash the number of purchases for this period in the trailing metrics
    state.demandFactoring.trailingPeriodPurchases[
      demandFactorPeriodIndex(state.demandFactoring.currentPeriod)
    ] = numNamesPurchasedInLastPeriod;

    // Increment the current period and reset the purchase count
    state.demandFactoring.currentPeriod++;
    state.demandFactoring.purchasesThisPeriod = 0;
  }

  return state;
}

function shouldUpdateDemandFactor(
  currentHeight: BlockHeight,
  state: DeepReadonly<IOState>,
): boolean {
  const currentPeriod = periodAtHeight(
    currentHeight,
    new BlockHeight(state.demandFactoring.periodZeroBlockHeight),
  );
  return currentPeriod > state.demandFactoring.currentPeriod;
}

function demandIsIncreasing({
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

export function purchasesThisPeriod(
  demandFactoringData: DeepReadonly<DemandFactoringData>,
): number {
  return demandFactoringData.trailingPeriodPurchases[
    demandFactorPeriodIndex(demandFactoringData.currentPeriod)
  ];
}
