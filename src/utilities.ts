import { DEFAULT_ANNUAL_PERCENTAGE_FEE } from './constants';
import { IOState, ServiceTier } from './types';

export function calculateTotalRegistrationFee(
  name: string,
  state: IOState,
  tier: ServiceTier,
  years: number,
) {
  // Initial cost to register a name
  const initialNamePurchaseFee = state.fees[name.length.toString()];

  // total cost to purchase name and tier
  return (
    initialNamePurchaseFee + calculateAnnualRenewalFee(name, state, tier, years)
  );
}

export function calculateAnnualRenewalFee(
  name: string,
  state: IOState,
  tier: ServiceTier,
  years: number,
) {
  // Determine annual registration price of name
  const initialNamePurchaseFee = state.fees[name.length.toString()];

  // Annual fee is specific % of initial purchase cost
  const nameAnnualRegistrationFee =
    initialNamePurchaseFee * DEFAULT_ANNUAL_PERCENTAGE_FEE;

  // Annual tier fee
  const tierAnnualFee = tier.fee;

  // Total annual costs (registration fee + tier fee)
  return (nameAnnualRegistrationFee + tierAnnualFee) * years;
}
