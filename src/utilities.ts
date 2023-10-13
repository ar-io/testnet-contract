import {
  ANNUAL_PERCENTAGE_FEE,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_INPUT_MESSAGE,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NAMESPACE_LENGTH,
  PERMABUY_LEASE_FEE_LENGTH,
  RARITY_MULTIPLIER_HALVENING,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  UNDERNAME_REGISTRATION_IO_FEE,
} from './constants';
import { Fees } from './types';

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
  const blockIntervalsPassed = Math.max(
    0,
    Math.floor((currentBlockHeight - startHeight) / decayInterval),
  );
  const dutchAuctionBid =
    startPrice * Math.pow(1 - decayRate, blockIntervalsPassed);
  const minimumBid = Math.ceil(Math.max(floorPrice, dutchAuctionBid));
  return minimumBid;
}

// check if a string is a valid fully qualified domain name
export function isValidFQDN(fqdn: string): boolean {
  const fqdnRegex = /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{1,63}$/;
  return fqdnRegex.test(fqdn);
}

// check if it is a valid arweave base64url for a wallet public address, transaction id or smartweave contract
export function isValidArweaveBase64URL(base64URL: string): boolean {
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

export function calculateUndernamePermutations(domain: string): number {
  const numberOfPossibleCharacters = 38; // 26 letters + 10 numbers + - (dash) + _ (underscore)
  const numberOfAllowedStartingAndEndingCharacters = 36; // 26 letters + 10 numbers
  const nameSpaceLength = NAMESPACE_LENGTH - domain.length; // should be between 11 and 61
  let numberOfPossibleUndernames = 0;

  for (
    let undernameLength = 1;
    undernameLength <= nameSpaceLength;
    undernameLength++
  ) {
    if (undernameLength === 1 || undernameLength === nameSpaceLength) {
      numberOfPossibleUndernames +=
        numberOfAllowedStartingAndEndingCharacters ** undernameLength;
    } else {
      numberOfPossibleUndernames +=
        numberOfPossibleCharacters ** undernameLength;
    }
  }
  return numberOfPossibleUndernames;
}

export function isNameInGracePeriod(currentTime: number, endTimestamp: number) {
  return endTimestamp + SECONDS_IN_GRACE_PERIOD >= currentTime;
}

export function getLeaseDurationFromEndTimestamp(start: number, end: number) {
  const differenceInYears = Math.ceil((end - start) / SECONDS_IN_A_YEAR);
  const years = Math.max(1, differenceInYears);

  return years;
}

export function getMaxLeaseExtension(
  currentTimestamp: number,
  endTimestamp: number,
): number {
  // if expired return 0 because it cannot be extended and must be re-bought
  if (currentTimestamp > endTimestamp + SECONDS_IN_GRACE_PERIOD) {
    return 0;
  }

  if (isNameInGracePeriod(currentTimestamp, endTimestamp)) {
    return MAX_YEARS;
  }
  // a number between 0 and 5 (MAX_YEARS)
  return (
    MAX_YEARS - getLeaseDurationFromEndTimestamp(currentTimestamp, endTimestamp)
  );
}

export function getInvalidAjvMessage(validator: any, input: any) {
  return `${INVALID_INPUT_MESSAGE} for ${this.function}: ${validator.errors
    .map((e) => {
      const key = e.instancePath.replace('/', '');
      const value = input[key];
      return `${key} ('${value}') ${e.message}`;
    })
    .join(', ')}`;
}

export function getAuctionPrices({
  auctionSettings,
  startHeight,
  startPrice,
  floorPrice,
}) {
  const { auctionDuration, decayRate, decayInterval } = auctionSettings;
  const intervalCount = auctionDuration / decayInterval;
  const prices = {};
  for (let i = 0; i <= intervalCount; i++) {
    const intervalHeight = startHeight + i * decayInterval;
    const price = calculateMinimumAuctionBid({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: intervalHeight,
      decayInterval,
      decayRate,
    });
    prices[intervalHeight] = price;
  }
  return prices;
}
