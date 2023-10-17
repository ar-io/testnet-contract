import {
  ANNUAL_PERCENTAGE_FEE,
  ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NAMESPACE_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  PERMABUY_LEASE_FEE_LENGTH,
  RARITY_MULTIPLIER_HALVENING,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
  UNDERNAME_REGISTRATION_IO_FEE,
} from './constants';
import { calculateMinimumAuctionBid } from './pricing';
import {
  ArNSName,
  Auction,
  AuctionSettings,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  Gateway,
  GatewayRegistrySettings,
  IOToken,
  RegistrationType,
  ReservedName,
} from './types';

declare class ContractError extends Error {}

export function calculateLeaseFee({
  name,
  fees,
  years,
  currentBlockTimestamp,
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
        undernames: DEFAULT_UNDERNAME_COUNT,
        endTimestamp: new BlockTimestamp(
          currentBlockTimestamp.valueOf() + SECONDS_IN_A_YEAR * years,
        ),
      }))
  );
}

export function calculateAnnualRenewalFee({
  name,
  fees,
  years,
  undernames,
  endTimestamp,
}: {
  name: string;
  fees: Fees;
  years: number;
  undernames: number;
  endTimestamp: BlockTimestamp;
}): number {
  // Determine annual registration price of name
  const initialNamePurchaseFee = fees[name.length.toString()];

  // Annual fee is specific % of initial purchase cost
  const nameAnnualRegistrationFee =
    initialNamePurchaseFee * ANNUAL_PERCENTAGE_FEE;

  const totalAnnualRenewalCost = nameAnnualRegistrationFee * years;

  const extensionEndTimestamp = new BlockTimestamp(
    endTimestamp.valueOf() + years * SECONDS_IN_A_YEAR,
  );
  // Do not charge for undernames if there are less or equal than the default
  const undernameCount =
    undernames > DEFAULT_UNDERNAME_COUNT
      ? undernames - DEFAULT_UNDERNAME_COUNT
      : undernames;

  const totalCost =
    undernameCount === DEFAULT_UNDERNAME_COUNT
      ? totalAnnualRenewalCost
      : totalAnnualRenewalCost +
        calculateProRatedUndernameCost({
          qty: undernameCount,
          currentBlockTimestamp: endTimestamp,
          type: 'lease',
          endTimestamp: extensionEndTimestamp,
        });

  return totalCost;
}

export function getRarityMultiplier({ name }: { name: string }): number {
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
  return 1;
}

export function calculatePermabuyFee({
  name,
  fees,
  currentBlockTimestamp,
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
    undernames: DEFAULT_UNDERNAME_COUNT,
    endTimestamp: new BlockTimestamp(
      currentBlockTimestamp.valueOf() +
        SECONDS_IN_A_YEAR * PERMABUY_LEASE_FEE_LENGTH,
    ),
  });
  const rarityMultiplier = getRarityMultiplier({ name });
  const permabuyFee = permabuyLeasePrice * rarityMultiplier;
  return demandFactoring.demandFactor * permabuyFee;
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
export function calculateProRatedUndernameCost({
  qty,
  currentBlockTimestamp,
  type,
  endTimestamp,
}: {
  qty: number;
  currentBlockTimestamp: BlockTimestamp;
  type: RegistrationType;
  endTimestamp?: BlockTimestamp;
  // demandFactoring: DemandFactoringData, // TODO: Is this relevant?
}): number {
  switch (type) {
    case 'lease':
      return (
        ((UNDERNAME_REGISTRATION_IO_FEE * qty) / SECONDS_IN_A_YEAR) *
        (endTimestamp.valueOf() - currentBlockTimestamp.valueOf())
      );
    case 'permabuy':
      return PERMABUY_LEASE_FEE_LENGTH * qty;
  }
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

export function getInvalidAjvMessage(
  validator: any,
  input: any,
  functionName: string,
): string {
  return `${INVALID_INPUT_MESSAGE} for ${functionName}: ${validator.errors
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
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
}): Record<number, number> {
  const { auctionDuration, decayRate, decayInterval } = auctionSettings;
  const intervalCount = auctionDuration / decayInterval;
  const prices: Record<number, number> = {};
  for (let i = 0; i <= intervalCount; i++) {
    const intervalHeight = new BlockHeight(
      startHeight.valueOf() + i * decayInterval,
    );
    const price = calculateMinimumAuctionBid({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: intervalHeight,
      decayInterval,
      decayRate,
    });
    prices[intervalHeight.valueOf()] = price.valueOf();
  }
  return prices;
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

export function isExistingActiveRecord({
  record,
  currentBlockTimestamp,
}: {
  record: ArNSName;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  return (
    record &&
    record.endTimestamp &&
    record.endTimestamp + SECONDS_IN_GRACE_PERIOD >
      currentBlockTimestamp.valueOf()
  );
}

export function isShortNameRestricted({
  name,
  currentBlockTimestamp,
}: {
  name: string;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  return (
    name.length < MINIMUM_ALLOWED_NAME_LENGTH &&
    currentBlockTimestamp.valueOf() < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP
  );
}

export function isActiveReservedName({
  caller,
  reservedName,
  currentBlockTimestamp,
}: {
  caller: string | undefined;
  reservedName: ReservedName | undefined;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  if (!reservedName) return false;
  const target = reservedName.target;
  const endTimestamp = reservedName.endTimestamp;
  const permanentlyReserved = !target && !endTimestamp;
  const callerNotTarget = !caller || target !== caller;
  const notExpired =
    endTimestamp && endTimestamp > currentBlockTimestamp.valueOf();
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
  currentBlockTimestamp: BlockTimestamp;
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
  currentBlockHeight: BlockHeight;
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
  const endHeight =
    currentBlockHeight.valueOf() + auctionSettings.auctionDuration;
  const years = type === 'lease' ? 1 : undefined;
  return {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice,
    floorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight.valueOf(), // auction starts right away
    endHeight, // auction ends after the set duration
    type,
    ...(years ? { years } : {}),
    settings: auctionSettings,
  };
}

export function assertAvailableRecord({
  caller,
  name,
  records,
  reserved,
  currentBlockTimestamp,
}: {
  caller: string | undefined; // TODO: type for this
  name: DeepReadonly<string>;
  records: DeepReadonly<Record<string, ArNSName>>;
  reserved: DeepReadonly<Record<string, ReservedName>>;
  currentBlockTimestamp: BlockTimestamp;
}): void {
  if (
    isExistingActiveRecord({
      record: records[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
  }
  if (
    isActiveReservedName({
      caller,
      reservedName: reserved[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
  }

  if (isShortNameRestricted({ name, currentBlockTimestamp })) {
    throw new ContractError(INVALID_SHORT_NAME);
  }
}

export function getEndTimestampForAuction({
  auction,
  currentBlockTimestamp,
}: {
  auction: Auction;
  currentBlockTimestamp: BlockTimestamp;
}): BlockTimestamp {
  switch (auction.type) {
    case 'permabuy':
      return undefined;
    case 'lease':
      return new BlockTimestamp(
        currentBlockTimestamp.valueOf() + SECONDS_IN_A_YEAR * auction.years,
      );
  }
}

export const calculateExistingAuctionBidForCaller = ({
  caller,
  auction,
  submittedBid,
  requiredMinimumBid,
}: {
  caller: string;
  auction: Auction;
  submittedBid: number;
  requiredMinimumBid: IOToken;
}): IOToken => {
  let finalBid = submittedBid
    ? Math.min(submittedBid, requiredMinimumBid.valueOf())
    : requiredMinimumBid.valueOf();

  if (caller === auction.initiator) {
    finalBid -= auction.floorPrice;
  }
  return new IOToken(finalBid);
};

export const isGatewayJoined = ({
  gateway,
  currentBlockHeight,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
}): boolean => {
  if (!gateway) return false;
  return (
    gateway.status === 'joined' && gateway.end > currentBlockHeight.valueOf()
  );
};

export const isGatewayHidden = ({
  gateway,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
}): boolean => {
  if (!gateway) return false;
  return gateway.status === 'hidden';
};

export const isGatewayEligibleToBeRemoved = ({
  gateway,
  currentBlockHeight,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
}): boolean => {
  return (
    gateway.status === 'leaving' && gateway.end <= currentBlockHeight.valueOf()
  );
};

export const isGatewayEligibleToLeave = ({
  gateway,
  currentBlockHeight,
  registrySettings,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
  registrySettings: GatewayRegistrySettings;
}): boolean => {
  if (!gateway) return false;
  const joinedForMinimum =
    currentBlockHeight.valueOf() >=
    gateway.start + registrySettings.minGatewayJoinLength;
  const isActiveOrHidden =
    isGatewayJoined({ gateway, currentBlockHeight }) ||
    isGatewayHidden({ gateway });
  return joinedForMinimum && isActiveOrHidden;
};
