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
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
  UNDERNAME_REGISTRATION_IO_FEE,
} from './constants';
import {
  ArNSName,
  Auction,
  AuctionSettings,
  Fees,
  RegistrationType,
  ReservedName,
} from './types';

declare const ContractError: any;

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
    calculateAnnualRenewalFee({
      name,
      fees,
      years,
      undernameCount: DEFAULT_UNDERNAME_COUNT,
      endTimestamp: currentTimestamp + SECONDS_IN_A_YEAR * years,
    })
  );
}

export function calculateAnnualRenewalFee({
  name,
  fees,
  years,
  undernameCount,
  endTimestamp,
}: {
  name: string;
  fees: Fees;
  years: number;
  undernameCount: number;
  endTimestamp: number;
}): number {
  // Determine annual registration price of name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // Annual fee is specific % of initial purchase cost
  const nameAnnualRegistrationFee =
    initialNamePurchaseFee * ANNUAL_PERCENTAGE_FEE;

  const totalAnnualRenewalCost = nameAnnualRegistrationFee * years;

  const extensionEndTimestamp = endTimestamp + years * SECONDS_IN_A_YEAR;
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

export function getRarityMultiplierForName({ name }: { name: string }) {
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
    const rarityPercentIncreaseForName = 10 - name.length / 10;
    return 1 + rarityPercentIncreaseForName;
  }
  throw new ContractError('Unable to compute name multiplier.');
}

export function calculatePermabuyFee(
  name: string,
  fees: Fees,
  currentTimestamp: number,
): number {
  // calculate the annual fee for the name for default of 10 years
  const permabuyLeasePrice = calculateAnnualRenewalFee({
    name,
    fees,
    years: PERMABUY_LEASE_FEE_LENGTH,
    undernameCount: DEFAULT_UNDERNAME_COUNT,
    endTimestamp:
      currentTimestamp + SECONDS_IN_A_YEAR * PERMABUY_LEASE_FEE_LENGTH,
  });

  const rarityMultiplier = getRarityMultiplierForName({ name });
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
  return (
    !!balances[wallet] && !isNaN(balances[wallet]) && balances[wallet] >= qty
  );
}

// TODO: update after dynamic pricing?
export function calculateProRatedUndernameCost(
  qty: number,
  currentTimestamp: number,
  type: RegistrationType,
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

export function isNameInGracePeriod(
  currentTime: number,
  endTimestamp: number,
): boolean {
  return endTimestamp + SECONDS_IN_GRACE_PERIOD >= currentTime;
}

export function getLeaseDurationFromEndTimestamp(
  start: number,
  end: number,
): number {
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

export function getInvalidAjvMessage(validator: any, input: any): string {
  return `${INVALID_INPUT_MESSAGE} for ${this.function}: ${validator.errors
    .map((e: any) => {
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
}: {
  auctionSettings: AuctionSettings;
  startHeight: number;
  startPrice: number;
  floorPrice: number;
}): { [x: number]: number } {
  const { auctionDuration, decayRate, decayInterval } = auctionSettings;
  const intervalCount = auctionDuration / decayInterval;
  const prices: { [x: number]: number } = {};
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

export function calculateRegistrationFee({
  type,
  name,
  fees,
  years,
  currentBlockTimestamp,
}: {
  type: RegistrationType;
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

export function isExistingActiveRecord({
  record,
  currentBlockTimestamp,
}: {
  record: ArNSName;
  currentBlockTimestamp: number;
}): boolean {
  return (
    record &&
    record.endTimestamp &&
    record.endTimestamp + SECONDS_IN_GRACE_PERIOD > currentBlockTimestamp
  );
}

export function isShortNameRestricted({
  name,
  currentBlockTimestamp,
}: {
  name: string;
  currentBlockTimestamp: number;
}): boolean {
  return (
    name.length < MINIMUM_ALLOWED_NAME_LENGTH &&
    currentBlockTimestamp < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP
  );
}

export function isActiveReservedName({
  caller,
  reservedName,
  currentBlockTimestamp,
}: {
  caller: string;
  reservedName: ReservedName | undefined;
  currentBlockTimestamp: number;
}): boolean {
  if (!reservedName) return false;
  const target = reservedName.target;
  const endTimestamp = reservedName.endTimestamp;
  const permanentlyReserved = !target && !endTimestamp;
  const callerNotTarget = target !== caller;
  const notExpired = endTimestamp && endTimestamp > currentBlockTimestamp;
  if (permanentlyReserved || (callerNotTarget && notExpired)) {
    return true;
  }
  return false;
}

export function isNameAvailableForAuction({
  name,
  record,
  reservedName,
  caller,
  currentBlockTimestamp,
}: {
  name: string;
  record: ArNSName | undefined;
  caller: string;
  reservedName: ReservedName | undefined;
  currentBlockTimestamp: number;
}): boolean {
  return (
    !isExistingActiveRecord({ record, currentBlockTimestamp }) &&
    !isActiveReservedName({ reservedName, caller, currentBlockTimestamp }) &&
    !isShortNameRestricted({ name, currentBlockTimestamp })
  );
}

export function isNameRequiredToBeAuction({
  name,
  type,
}: {
  name: string;
  type: RegistrationType;
}): boolean {
  return type === 'permabuy' && name.length < 12;
}
export function createAuctionObject({
  auctionSettings,
  initialRegistrationFee,
  contractTxId,
  currentBlockHeight,
  type,
  initiator,
  providedFloorPrice,
}: {
  auctionSettings: AuctionSettings;
  initialRegistrationFee: number;
  contractTxId: string | undefined;
  currentBlockHeight: number;
  type: RegistrationType;
  initiator: string | undefined;
  years?: number;
  providedFloorPrice?: number;
}): Auction {
  const calculatedFloor =
    initialRegistrationFee * auctionSettings.floorPriceMultiplier;
  // if someone submits a high floor price, we'll take it
  const floorPrice = providedFloorPrice
    ? Math.max(providedFloorPrice, calculatedFloor)
    : calculatedFloor;

  const startPrice = floorPrice * auctionSettings.startPriceMultiplier;
  const endHeight = currentBlockHeight + auctionSettings.auctionDuration;
  const years = type === 'lease' ? 1 : undefined;
  return {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice,
    floorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight, // auction starts right away
    endHeight, // auction ends after the set duration
    type,
    ...(years ? { years } : {}),
    settings: auctionSettings,
  };
}
