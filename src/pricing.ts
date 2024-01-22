import {
  ANNUAL_PERCENTAGE_FEE,
  DEMAND_FACTORING_SETTINGS,
  DemandFactoringCriteria,
  FEES,
  ONE_MIO,
  PERMABUY_LEASE_FEE_LENGTH,
  UNDERNAME_LEASE_FEE_PERCENTAGE,
  UNDERNAME_PERMABUY_FEE_PERCENTAGE,
} from './constants';
import {
  ArNSName,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  RegistrationType,
} from './types';

export function tallyNamePurchase(
  dfData: DeepReadonly<DemandFactoringData>,
  revenue: number,
): DemandFactoringData {
  const newDfData = cloneDemandFactoringData(dfData);
  newDfData.purchasesThisPeriod++;
  newDfData.revenueThisPeriod += revenue;
  return newDfData;
}

export function updateDemandFactor(
  currentHeight: BlockHeight,
  dfData: DeepReadonly<DemandFactoringData>,
): { demandFactoring: DemandFactoringData; fees: Fees } {
  if (!shouldUpdateDemandFactor(currentHeight, dfData)) {
    return {
      demandFactoring: dfData as DemandFactoringData,
      fees: FEES,
    };
  }

  const newDemandFactoringData = cloneDemandFactoringData(dfData);
  let updatedFees: Fees | undefined;

  const numNamesPurchasedInLastPeriod = dfData.purchasesThisPeriod;
  const mvgAvgOfTrailingNamePurchases = mvgAvgTrailingPurchaseCounts(dfData);
  const revenueInLastPeriod = dfData.revenueThisPeriod;
  const mvgAvgOfTrailingRevenue = mvgAvgTrailingRevenues(dfData);
  if (
    demandIsIncreasing({
      numNamesPurchasedInLastPeriod,
      mvgAvgOfTrailingNamePurchases,
      revenueInLastPeriod,
      mvgAvgOfTrailingRevenue,
      demandFactoringCriteria: DEMAND_FACTORING_SETTINGS.criteria,
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
      updatedFees = Object.keys(FEES).reduce(
        (acc: Fees, nameLength: string) => {
          acc[nameLength] = Math.max(
            FEES[nameLength] * DEMAND_FACTORING_SETTINGS.demandFactorMin,
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

  // Stash the number of purchases and revenue for this period in the trailing metrics
  const trailingPeriodIndex = demandFactorPeriodIndex(
    newDemandFactoringData.currentPeriod,
  );
  newDemandFactoringData.trailingPeriodPurchases[trailingPeriodIndex] =
    numNamesPurchasedInLastPeriod;
  newDemandFactoringData.trailingPeriodRevenues[trailingPeriodIndex] =
    revenueInLastPeriod;

  // Increment the current period and reset the purchase count and revenue amount
  newDemandFactoringData.currentPeriod++;
  newDemandFactoringData.purchasesThisPeriod = 0;
  newDemandFactoringData.revenueThisPeriod = 0;

  return {
    demandFactoring: newDemandFactoringData,
    fees: updatedFees || FEES,
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
  mvgAvgOfTrailingNamePurchases: mvgAvgOfTailingNamePurchases,
  revenueInLastPeriod,
  mvgAvgOfTrailingRevenue,
  demandFactoringCriteria,
}: {
  numNamesPurchasedInLastPeriod: number;
  mvgAvgOfTrailingNamePurchases: number;
  revenueInLastPeriod: number;
  mvgAvgOfTrailingRevenue: number;
  demandFactoringCriteria: DemandFactoringCriteria;
}): boolean {
  switch (demandFactoringCriteria) {
    case 'purchases':
      return (
        numNamesPurchasedInLastPeriod >= mvgAvgOfTailingNamePurchases &&
        numNamesPurchasedInLastPeriod !== 0
      );
    case 'revenue':
      return (
        revenueInLastPeriod >= mvgAvgOfTrailingRevenue &&
        revenueInLastPeriod !== 0
      );
  }
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

export function mvgAvgTrailingRevenues(
  dfData: DeepReadonly<DemandFactoringData>,
): number {
  return (
    dfData.trailingPeriodRevenues.reduce(
      (acc, periodRevenue) => acc + periodRevenue,
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
    trailingPeriodRevenues: dfData.trailingPeriodRevenues.slice(),
  };
}

export function calculateLeaseFee({
  name,
  fees,
  years,
  demandFactoring,
}: {
  name: string;
  fees: Fees;
  years: number;
  currentBlockTimestamp: BlockTimestamp;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): number {
  // Initial cost to register a name
  // TODO: Harden the types here to make fees[name.length] an error
  const initialNamePurchaseFee = fees[name.length.toString()];

  // total cost to purchase name
  return (
    demandFactoring.demandFactor *
    (initialNamePurchaseFee +
      calculateAnnualRenewalFee({
        name,
        fees,
        years,
      }))
  );
}

export function calculateAnnualRenewalFee({
  name,
  fees,
  years,
}: {
  name: string;
  fees: Fees;
  years: number;
}): number {
  // Determine annual registration price of name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // Annual fee is specific % of initial purchase cost
  const nameAnnualRegistrationFee =
    initialNamePurchaseFee * ANNUAL_PERCENTAGE_FEE;

  const totalAnnualRenewalCost = nameAnnualRegistrationFee * years;

  return totalAnnualRenewalCost;
}

export function calculatePermabuyFee({
  name,
  fees,
  demandFactoring,
}: {
  name: string;
  fees: Fees;
  currentBlockTimestamp: BlockTimestamp;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): number {
  // calculate the annual fee for the name for default of 10 years
  const permabuyLeasePrice = calculateAnnualRenewalFee({
    name,
    fees,
    years: PERMABUY_LEASE_FEE_LENGTH,
  });
  return demandFactoring.demandFactor * permabuyLeasePrice;
}

export function calculateRegistrationFee({
  type,
  name,
  fees,
  years,
  currentBlockTimestamp,
  demandFactoring,
}: {
  type: RegistrationType;
  name: string;
  fees: Fees;
  years: number;
  currentBlockTimestamp: BlockTimestamp;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): number {
  switch (type) {
    case 'lease':
      return calculateLeaseFee({
        name,
        fees,
        years,
        currentBlockTimestamp,
        demandFactoring,
      });
    case 'permabuy':
      return calculatePermabuyFee({
        name,
        fees,
        currentBlockTimestamp,
        demandFactoring,
      });
  }
}

export function calculateUndernameCost({
  name,
  fees,
  increaseQty,
  type,
  demandFactoring,
  years,
}: {
  name: ArNSName;
  fees: Fees;
  increaseQty: number;
  type: RegistrationType;
  years: number;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): number {
  const initialNameFee = fees[name.length.toString()];
  const getUndernameFeePercentage = () => {
    switch (type) {
      case 'lease':
        return UNDERNAME_LEASE_FEE_PERCENTAGE;
      case 'permabuy':
        return UNDERNAME_PERMABUY_FEE_PERCENTAGE;
    }
  };
  const undernamePercentageFee = getUndernameFeePercentage();
  const totalFeeForQtyAndYears =
    initialNameFee * undernamePercentageFee * increaseQty * years;
  return demandFactoring.demandFactor * totalFeeForQtyAndYears;
}
