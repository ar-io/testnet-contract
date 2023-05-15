import { DEFAULT_ANNUAL_PERCENTAGE_FEE } from './constants';
import { Fees, ServiceTier } from './types';

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
    initialNamePurchaseFee * DEFAULT_ANNUAL_PERCENTAGE_FEE;

  // Annual tier fee
  const tierAnnualFee = tier.fee;

  // Total annual costs (registration fee + tier fee)
  return (nameAnnualRegistrationFee + tierAnnualFee) * years;
}

export function calculatePermabuyFee(
  name: string,
  fees: Fees,
  multiplier: number,
) {
  return fees[name.length.toString()] * multiplier;
}

export function calculateMinimumAuctionBid({
  startHeight,
  initialPrice,
  floorPrice,
  currentBlockHeight,
  decayInterval,
  decayRate,
}: {
  startHeight: number;
  initialPrice: number;
  floorPrice: number;
  currentBlockHeight: number;
  decayInterval: number;
  decayRate: number;
}): number {
  const blockIntervalsPassed = Math.floor(
    (currentBlockHeight - startHeight) / decayInterval,
  );
  const dutchAuctionBid =
    initialPrice * Math.pow(decayRate, blockIntervalsPassed);
  const minimumBid = Math.max(dutchAuctionBid, floorPrice);
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
  return balances[wallet] && balances[wallet] >= qty;
}
