import {
  ANNUAL_PERCENTAGE_FEE,
  MINIMUM_ALLOWED_NAME_LENGTH,
  RARITY_MULTIPLIER_HALVENING,
} from './constants';
import { Fees, ServiceTier } from './types';

declare const ContractError: any;

export function calculateTotalRegistrationFee(
  name: string,
  fees: Fees,
  tier: ServiceTier,
  years: number,
) {
  // Initial cost to register a name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // total cost to purchase name and tier
  return (
    initialNamePurchaseFee + calculateAnnualRenewalFee(name, fees, tier, years)
  );
}

export function calculateAnnualRenewalFee(
  name: string,
  fees: Fees,
  tier: ServiceTier,
  years: number,
) {
  // Determine annual registration price of name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // Annual fee is specific % of initial purchase cost
  const nameAnnualRegistrationFee =
    initialNamePurchaseFee * ANNUAL_PERCENTAGE_FEE;

  // Annual tier fee
  const tierAnnualFee = tier.fee;

  // Total annual costs (registration fee + tier fee)
  return (nameAnnualRegistrationFee + tierAnnualFee) * years;
}

export function calculatePermabuyFee(
  name: string,
  fees: Fees,
  tier: ServiceTier,
) {
  const PERMABUY_LEASE_FEE_LENGTH = 10;
  // calculate the annual fee for the name for default of 10 years
  const permabuyLeasePrice = calculateAnnualRenewalFee(
    name,
    fees,
    tier,
    PERMABUY_LEASE_FEE_LENGTH,
  );
  // rarity multiplier based on the length of the name (e.g 1.3);
  // e.g. name is 7 characters - this would be 0
  // name is 2 characters - this would 8
  const getMultiplier = (): number => {
    if (name.length >= RARITY_MULTIPLIER_HALVENING) {
      return 0.5; // cut the price in half
    }
    // names between 5 and 24 characters (inclusive)
    if (name.length >= MINIMUM_ALLOWED_NAME_LENGTH && name.length < RARITY_MULTIPLIER_HALVENING) {
      return 1; // e.g. it's the cost of a 10 year lease
    }
    // short names
    if (name.length < MINIMUM_ALLOWED_NAME_LENGTH) {
      const shortNameMultiplier = 1 + ((10 - name.length) * 10) / 100;
      return shortNameMultiplier;
    }
    throw new ContractError('Unable to compute name multiplier.');
  };
  const rarityMultiplier = getMultiplier();
  const permabuyFee = permabuyLeasePrice * rarityMultiplier;
  return permabuyFee;
}

export function calculateMinimumAuctionBid({
  startHeight,
  startPrice,
  floorPrice,
  currentBlockHeight,
  decayInterval,
  decayRate,
}: {
  startHeight: number;
  startPrice: number;
  floorPrice: number;
  currentBlockHeight: number;
  decayInterval: number;
  decayRate: number;
}): number {
  const blockIntervalsPassed = Math.floor(
    (currentBlockHeight - startHeight) / decayInterval,
  );
  const dutchAuctionBid =
    startPrice * Math.pow(1 - decayRate, blockIntervalsPassed);
  const minimumBid = Math.ceil(Math.max(floorPrice, dutchAuctionBid));
  return minimumBid;
}

// check if a string is a valid fully qualified domain name
export function isValidFQDN(fqdn: string) {
  const fqdnRegex = /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{1,6}$/;
  return fqdnRegex.test(fqdn);
}

// check if it is a valid arweave base64url for a wallet public address, transaction id or smartweave contract
export function isValidArweaveBase64URL(base64URL: string) {
  const base64URLRegex = new RegExp('^[a-zA-Z0-9_-]{43}$');
  return base64URLRegex.test(base64URL);
}

export function walletHasSufficientBalance(
  balances: { [x: string]: number },
  wallet: string,
  qty: number,
): boolean {
  return !!balances[wallet] && balances[wallet] >= qty;
}
