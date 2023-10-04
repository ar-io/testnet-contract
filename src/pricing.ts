import { DEMAND_FACTORING_SETTINGS } from './constants';
import {
  BlockHeight,
  DeepReadonly,
  DemandFactoringData,
  IOState,
} from './types';

export function tallyNamePurchase(
  currentHeight: BlockHeight,
  dfData: DeepReadonly<DemandFactoringData>,
): DemandFactoringData {
  const newDfData = {
    ...dfData,
    trailingPeriodPurchases: dfData.trailingPeriodPurchases.slice(),
  };

  newDfData.purchasesThisPeriod++;
  newDfData.trailingPeriodPurchases[demandFactorPeriodIndex(currentHeight)]++;

  return newDfData;
}

export function updateDemandFactor(
  currentHeight: BlockHeight,
  state: IOState,
): IOState {
  if (shouldUpdateDemandFactor(currentHeight, state)) {
    // Update to the demand factor that will be used for the next period
    const numNamesPurchasedInLastPeriod =
      state.demandFactoring.purchasesThisPeriod;
    const mvgAvgOfTrailingNamePurchases = mvgAvgTrailingPurchaseCounts(state);
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

    // Increment the period
    state.demandFactoring.periodStartBlockHeight = currentHeight.valueOf();

    // Reset the number of purchases for this period
    state.demandFactoring.purchasesThisPeriod = 0;
    state.demandFactoring.trailingPeriodPurchases[
      demandFactorPeriodIndex(currentHeight)
    ] = 0;
  }

  return state;
}

function shouldUpdateDemandFactor(
  currentHeight: BlockHeight,
  state: IOState,
): boolean {
  return (
    currentHeight.valueOf() > state.demandFactoring.periodStartBlockHeight &&
    (currentHeight.valueOf() - state.demandFactoring.periodStartBlockHeight) %
      DEMAND_FACTORING_SETTINGS.periodBlockCount ===
      0
  );
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

function demandFactorPeriodIndex(periodStartBlockHeight: BlockHeight): number {
  return (
    periodStartBlockHeight.valueOf() %
    DEMAND_FACTORING_SETTINGS.periodBlockCount
  );
}

function mvgAvgTrailingPurchaseCounts(state: IOState): number {
  return (
    state.demandFactoring.trailingPeriodPurchases.reduce(
      (acc, periodPurchaseCount) => acc + periodPurchaseCount,
      0,
    ) / DEMAND_FACTORING_SETTINGS.movingAvgPeriodCount
  );
}
