import {
  ANNUAL_PERCENTAGE_FEE,
  DEFAULT_UNDERNAME_COUNT,
  MINIMUM_ALLOWED_NAME_LENGTH,
  PERMABUY_LEASE_FEE_LENGTH,
  RARITY_MULTIPLIER_HALVENING,
  SECONDS_IN_A_YEAR,
  UNDERNAME_REGISTRATION_IO_FEE,
} from './constants';
import { Fees } from './types';

declare const ContractError: any;

export function calculateRegistrationFee({
  type,
  name,
  fees,
  years,
  currentBlockTimestamp,
}: {
  type: 'lease' | 'permabuy';
  name: string;
  fees: Fees;
  years: number;
  currentBlockTimestamp: number;
}): number {
  switch (type) {
    case 'lease':
      return calculateLeaseFee(name, fees, years, currentBlockTimestamp);
    case 'permabuy':
      return calculatePermabuyFee(name, fees, currentBlockTimestamp);
  }
}

export function calculateLeaseFee(
  name: string,
  fees: Fees,
  years: number,
  currentTimestamp: number, // block timestamp
): number {
  // Initial cost to register a name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // total cost to purchase name
  return (
    initialNamePurchaseFee +
    calculateAnnualRenewalFee(
      name,
      fees,
      years,
      DEFAULT_UNDERNAME_COUNT,
      currentTimestamp + SECONDS_IN_A_YEAR * years,
    )
  );
}

export function calculateAnnualRenewalFee(
  name: string,
  fees: Fees,
  years: number,
  undernames: number,
  endTimestamp: number,
): number {
  // Determine annual registration price of name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // Annual fee is specific % of initial purchase cost
  const nameAnnualRegistrationFee =
    initialNamePurchaseFee * ANNUAL_PERCENTAGE_FEE;

  const totalAnnualRenewalCost = nameAnnualRegistrationFee * years;

  const extensionEndTimestamp = endTimestamp + years * SECONDS_IN_A_YEAR;
  // Do not charge for undernames if there are less or equal than the default
  const undernameCount =
    undernames > DEFAULT_UNDERNAME_COUNT
      ? undernames - DEFAULT_UNDERNAME_COUNT
      : undernames;

  const totalCost =
    totalAnnualRenewalCost +
    calculateProRatedUndernameCost({
      count: undernameCount,
      currentTimestamp: endTimestamp,
      type: 'lease',
      endTimestamp: extensionEndTimestamp,
    });

  return totalCost;
}

export function calculateProRatedUndernameCost({
  count,
  currentTimestamp,
  type,
  endTimestamp,
}: {
  count: number;
  currentTimestamp: number;
  type: 'lease' | 'permabuy';
  endTimestamp?: number;
}): number {
  switch (type) {
    case 'lease':
      return (
        ((UNDERNAME_REGISTRATION_IO_FEE * count) / SECONDS_IN_A_YEAR) *
        (endTimestamp - currentTimestamp)
      );
    case 'permabuy':
      return (
        ((PERMABUY_LEASE_FEE_LENGTH * count) / SECONDS_IN_A_YEAR) *
        (endTimestamp - currentTimestamp)
      );
  }
}

export function getRarityMultiper({ name }: { name: string }): number {
  if (name.length >= RARITY_MULTIPLIER_HALVENING) {
    return 0.5; // cut the price in half
  }
  // names between 5 and 24 characters (inclusive)
  if (
    name.length >= MINIMUM_ALLOWED_NAME_LENGTH &&
    name.length < RARITY_MULTIPLIER_HALVENING
  ) {
    return 1; // e.g. it's the cost of a 10 year lease
  }
  // short names
  if (name.length < MINIMUM_ALLOWED_NAME_LENGTH) {
    const shortNameMultiplier = 1 + ((10 - name.length) * 10) / 100;
    return shortNameMultiplier;
  }
  throw new ContractError('Unable to compute name multiplier.');
}

export function calculatePermabuyFee(
  name: string,
  fees: Fees,
  currentTimestamp: number,
): number {
  // calculate the annual fee for the name for default of 10 years
  const permabuyLeasePrice = calculateAnnualRenewalFee(
    name,
    fees,
    PERMABUY_LEASE_FEE_LENGTH,
    DEFAULT_UNDERNAME_COUNT,
    currentTimestamp + SECONDS_IN_A_YEAR * PERMABUY_LEASE_FEE_LENGTH,
  );
  const rarityMultiplier = getRarityMultiper({ name });
  const permabuyFee = permabuyLeasePrice * rarityMultiplier;
  return permabuyFee;
}
