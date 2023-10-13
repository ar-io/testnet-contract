import {
  ANNUAL_PERCENTAGE_FEE,
  DEFAULT_NUM_SAMPLED_BLOCKS,
  DEFAULT_SAMPLED_BLOCKS_OFFSET,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_INPUT_MESSAGE,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NAMESPACE_LENGTH,
  NUM_OBSERVERS_PER_EPOCH,
  PERMABUY_LEASE_FEE_LENGTH,
  RARITY_MULTIPLIER_HALVENING,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  UNDERNAME_REGISTRATION_IO_FEE,
} from './constants';
import { Fees, Gateway } from './types';

declare const ContractError: any;
declare const SmartWeave: any;

export function calculateTotalRegistrationFee(
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
    undernameCount === DEFAULT_UNDERNAME_COUNT
      ? totalAnnualRenewalCost
      : totalAnnualRenewalCost +
        calculateProRatedUndernameCost(
          undernameCount,
          endTimestamp,
          'lease',
          extensionEndTimestamp,
        );

  return totalCost;
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
  // rarity multiplier based on the length of the name (e.g 1.3);
  // e.g. name is 7 characters - this would be 0
  // name is 2 characters - this would 8
  const getMultiplier = (): number => {
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

// TODO: update after dynamic pricing?
export function calculateProRatedUndernameCost(
  qty: number,
  currentTimestamp: number,
  type: 'lease' | 'permabuy',
  endTimestamp?: number,
): number {
  const fullCost =
    type === 'lease'
      ? UNDERNAME_REGISTRATION_IO_FEE * qty
      : PERMABUY_LEASE_FEE_LENGTH * qty;
  const proRatedCost =
    type === 'lease'
      ? (fullCost / SECONDS_IN_A_YEAR) * (endTimestamp - currentTimestamp)
      : fullCost;
  return proRatedCost;
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

export function getEpochStart({
  startHeight,
  epochBlockLength,
  height,
}: {
  startHeight: number;
  epochBlockLength: number;
  height: number;
}): number {
  return (
    getEpochEnd({ startHeight, epochBlockLength, height }) +
    1 -
    epochBlockLength
  );
}

export function getEpochEnd({
  startHeight,
  epochBlockLength,
  height,
}: {
  startHeight: number;
  epochBlockLength: number;
  height: number;
}): number {
  return (
    startHeight +
    epochBlockLength *
      (Math.floor((height - startHeight) / epochBlockLength) + 1) -
    1
  );
}

export async function getEntropy(height: number): Promise<Buffer> {
  let entropyBuffer: Buffer;
  // We hash multiples block hashes to reduce the chance that someone will
  // influence the value produced by grinding with excessive hash power.
  for (let i = 0; i < DEFAULT_NUM_SAMPLED_BLOCKS; i++) {
    // TODO: FIX THIS!!! THIS DOES NOT WORK!!!
    const block = await SmartWeave.unsafeClient.blocks.getByHeight(
      `${height - DEFAULT_SAMPLED_BLOCKS_OFFSET - i}`,
    );

    if (!block.indep_hash || typeof block.indep_hash !== 'string') {
      throw new ContractError(`Block ${height - i} has no indep_hash`);
    }
    entropyBuffer = Buffer.concat([
      entropyBuffer,
      Buffer.from(block.indep_hash, 'base64url'),
    ]);
  }
  const hash = SmartWeave.arweave.crypto.hash(entropyBuffer, 'sha256');
  return hash;
}

export function getEligibleObservers(
  gateways: {
    [address: string]: Gateway;
  },
  gatewayLeaveLength: number,
  height: number,
): string[] {
  const eligibleObservers: string[] = [];
  for (const address in gateways) {
    const gateway = gateways[address];

    // Check the conditions
    const isWithinStartRange = gateway.start <= height;
    const isWithinEndRange =
      gateway.end === 0 || gateway.end - gatewayLeaveLength < height;

    // Keep the gateway if it meets the conditions
    if (isWithinStartRange && isWithinEndRange) {
      eligibleObservers.push(address);
    }
  }
  return eligibleObservers;
}

export async function getPrescribedObservers(
  gateways: {
    [address: string]: Gateway;
  },
  gatewayLeaveLength: number,
  height: number,
): Promise<string[]> {
  const prescribedObservers: string[] = [];
  const usedIndexes = new Set<number>();
  const entropy = await getEntropy(height);
  const prescribedObserversCount = Object.keys(gateways).length;

  // If we want to source more observers than exist in the list, just return all potential observers
  if (NUM_OBSERVERS_PER_EPOCH >= prescribedObserversCount) {
    for (let i = 0; i < prescribedObserversCount; i++) {
      for (const address in gateways) {
        prescribedObservers.push(address);
      }
    }
    return prescribedObservers;
  }
  const eligibleObservers = getEligibleObservers(
    gateways,
    gatewayLeaveLength,
    height,
  );

  let hash = SmartWeave.arweave.crypto.hash(entropy, 'sha256');
  for (let i = 0; i < NUM_OBSERVERS_PER_EPOCH; i++) {
    let index = hash.readUInt32BE(0) % prescribedObserversCount;

    while (usedIndexes.has(index)) {
      index = (index + 1) % prescribedObserversCount;
    }

    usedIndexes.add(index);
    prescribedObservers.push(eligibleObservers[index]);

    hash = SmartWeave.arweave.crypto.hash(hash, 'sha256');
  }

  return prescribedObservers;
}
