import {
  ARNS_NAME_RESERVED_MESSAGE,
  BLOCKS_PER_DAY,
  DEFAULT_NUM_SAMPLED_BLOCKS,
  DEFAULT_SAMPLED_BLOCKS_OFFSET,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  INVALID_TARGET_MESSAGE,
  MAX_TENURE_WEIGHT,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NAMESPACE_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  NUM_OBSERVERS_PER_EPOCH,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
  TENURE_WEIGHT_DAYS,
} from './constants';
import {
  ArNSNameData,
  AuctionData,
  Balances,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  Gateway,
  GatewayRegistrySettings,
  IOToken,
  Records,
  RegistrationType,
  ReservedNameData,
  ReservedNames,
  WalletAddress,
  WeightedObserver,
} from './types';

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
  balances: DeepReadonly<Balances>,
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

export function isNameInGracePeriod({
  currentBlockTimestamp,
  record,
}: {
  currentBlockTimestamp: BlockTimestamp;
  record: ArNSNameData;
}): boolean {
  if (!record.endTimestamp) return false;
  const recordIsExpired = currentBlockTimestamp.valueOf() > record.endTimestamp;
  return (
    recordIsExpired &&
    record.endTimestamp + SECONDS_IN_GRACE_PERIOD >
      currentBlockTimestamp.valueOf()
  );
}

export function getMaxAllowedYearsExtensionForRecord({
  currentBlockTimestamp,
  record,
}: {
  currentBlockTimestamp: BlockTimestamp;
  record: ArNSNameData;
}): number {
  if (!record.endTimestamp) {
    return 0;
  }
  // if expired return 0 because it cannot be extended and must be re-bought
  if (
    currentBlockTimestamp.valueOf() >
    record.endTimestamp + SECONDS_IN_GRACE_PERIOD
  ) {
    return 0;
  }

  if (isNameInGracePeriod({ currentBlockTimestamp, record })) {
    return MAX_YEARS;
  }

  // TODO: should we put this as the ceiling? or should we allow people to extend as soon as it is purchased
  const yearsRemainingOnLease = Math.ceil(
    (record.endTimestamp.valueOf() - currentBlockTimestamp.valueOf()) /
      SECONDS_IN_A_YEAR,
  );

  // a number between 0 and 5 (MAX_YEARS)
  return MAX_YEARS - yearsRemainingOnLease;
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
  let entropyBuffer: Buffer = Buffer.alloc(0);
  // We hash multiples block hashes to reduce the chance that someone will
  // influence the value produced by grinding with excessive hash power.
  for (let i = 0; i < DEFAULT_NUM_SAMPLED_BLOCKS; i++) {
    const offsetHeight =
      height - DEFAULT_SAMPLED_BLOCKS_OFFSET - i < 0
        ? 0
        : height - DEFAULT_SAMPLED_BLOCKS_OFFSET - i;
    const path = `/block/height/${offsetHeight}`;
    const data = await SmartWeave.safeArweaveGet(path);
    const indep_hash = data.indep_hash;
    if (!indep_hash || typeof indep_hash !== 'string') {
      throw new ContractError(`Block ${height - i} has no indep_hash`);
    }
    entropyBuffer = Buffer.concat([
      entropyBuffer,
      Buffer.from(indep_hash, 'base64url'),
    ]);
  }
  const hash = await SmartWeave.arweave.crypto.hash(entropyBuffer, 'SHA-256');
  return hash;
}

export async function getPrescribedObservers(
  gateways: {
    [address: string]: Gateway;
  },
  minNetworkJoinStakeAmount: number,
  gatewayLeaveLength: number,
  height: number,
): Promise<WeightedObserver[]> {
  const prescribedObservers: WeightedObserver[] = [];
  const weightedObservers: WeightedObserver[] = [];
  let totalCompositeWeight = 0;

  // Get all eligible observers and assign weights
  for (const address in gateways) {
    const gateway = gateways[address];

    // Check the conditions
    const isWithinStartRange = gateway.start <= height;
    const isWithinEndRange =
      gateway.end === 0 || gateway.end - gatewayLeaveLength < height;

    // Keep the gateway if it meets the conditions
    if (isWithinStartRange && isWithinEndRange) {
      const stake = gateways[address].operatorStake;
      const stakeWeight = stake / minNetworkJoinStakeAmount;
      let tenureWeight =
        (+SmartWeave.block.height - gateways[address].start) /
        (TENURE_WEIGHT_DAYS * BLOCKS_PER_DAY);

      if (tenureWeight > MAX_TENURE_WEIGHT) {
        tenureWeight = MAX_TENURE_WEIGHT;
      }

      // set reward ratio weights
      // TO DO AFTER REWARDS ARE IN!
      const gatewayRewardRatioWeight = 1;
      const observerRewardRatioWeight = 1;

      // calculate composite weight based on sub weights
      const compositeWeight =
        stakeWeight *
        tenureWeight *
        gatewayRewardRatioWeight *
        observerRewardRatioWeight;

      weightedObservers.push({
        gatewayAddress: address,
        observerAddress: gateway.observerWallet,
        stake,
        start: gateway.start,
        stakeWeight,
        tenureWeight,
        gatewayRewardRatioWeight,
        observerRewardRatioWeight,
        compositeWeight,
        normalizedCompositeWeight: compositeWeight,
      });
      totalCompositeWeight += compositeWeight;
    }
  }

  // calculate the normalized composite weight for each observer
  for (const weightedObserver of weightedObservers) {
    weightedObserver.normalizedCompositeWeight =
      weightedObserver.compositeWeight / totalCompositeWeight;
  }

  // If we want to source more observers than exist in the list, just return all eligible observers
  if (NUM_OBSERVERS_PER_EPOCH >= Object.keys(weightedObservers).length) {
    return weightedObservers;
  }

  const entropy = await getEntropy(height);
  const usedIndexes = new Set<number>();
  let hash = await SmartWeave.arweave.crypto.hash(entropy, 'SHA-256');
  for (let i = 0; i < NUM_OBSERVERS_PER_EPOCH; i++) {
    const random = hash.readUInt32BE(0) / 0xffffffff; // Convert hash to a value between 0 and 1
    let cumulativeNormalizedCompositeWeight = 0;
    for (let index = 0; index < weightedObservers.length; index++) {
      {
        cumulativeNormalizedCompositeWeight +=
          weightedObservers[index].normalizedCompositeWeight;
        if (random <= cumulativeNormalizedCompositeWeight) {
          if (!usedIndexes.has(index)) {
            prescribedObservers.push(weightedObservers[index]);
            usedIndexes.add(index);
            break;
          }
        }
      }
      // Compute the next hash for the next iteration
      hash = await SmartWeave.arweave.crypto.hash(hash, 'SHA-256');
    }
  }
  return prescribedObservers;
}

export function isExistingActiveRecord({
  record,
  currentBlockTimestamp,
}: {
  record: ArNSNameData;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  if (!record) return false;

  if (record.type === 'permabuy') {
    return true;
  }

  if (record.type === 'lease') {
    return (
      record.endTimestamp &&
      (record.endTimestamp > currentBlockTimestamp.valueOf() ||
        isNameInGracePeriod({ currentBlockTimestamp, record }))
    );
  }
  return false;
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
  reservedName: ReservedNameData | undefined;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  if (!reservedName) return false;
  const target = reservedName.target;
  const endTimestamp = reservedName.endTimestamp;
  const permanentlyReserved = !target && !endTimestamp;
  if (permanentlyReserved) {
    return true;
  }
  const callerNotTarget = !caller || target !== caller;
  const notExpired =
    endTimestamp && endTimestamp > currentBlockTimestamp.valueOf();
  if (callerNotTarget && notExpired) {
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
  record: ArNSNameData | undefined;
  caller: string;
  reservedName: ReservedNameData | undefined;
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

export function assertAvailableRecord({
  caller,
  name,
  records,
  reserved,
  currentBlockTimestamp,
}: {
  caller: string | undefined; // TODO: type for this
  name: DeepReadonly<string>;
  records: DeepReadonly<Records>;
  reserved: DeepReadonly<ReservedNames>;
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

export function calculateExistingAuctionBidForCaller({
  caller,
  auction,
  submittedBid,
  requiredMinimumBid,
}: {
  caller: string;
  auction: AuctionData;
  submittedBid: number;
  requiredMinimumBid: IOToken;
}): IOToken {
  let finalBid = submittedBid
    ? Math.min(submittedBid, requiredMinimumBid.valueOf())
    : requiredMinimumBid.valueOf();

  if (caller === auction.initiator) {
    finalBid -= auction.floorPrice;
  }
  return new IOToken(finalBid);
}

export function isGatewayJoined({
  gateway,
  currentBlockHeight,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
}): boolean {
  if (!gateway) return false;
  return (
    gateway.status === 'joined' && gateway.end > currentBlockHeight.valueOf()
  );
}

export function isGatewayHidden({
  gateway,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
}): boolean {
  return gateway?.status === 'hidden';
}

export function isGatewayEligibleToBeRemoved({
  gateway,
  currentBlockHeight,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
}): boolean {
  return (
    gateway?.status === 'leaving' &&
    gateway?.end <= currentBlockHeight.valueOf()
  );
}

export function isGatewayEligibleToLeave({
  gateway,
  currentBlockHeight,
  registrySettings,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
  registrySettings: GatewayRegistrySettings;
}): boolean {
  if (!gateway) return false;
  const joinedForMinimum =
    currentBlockHeight.valueOf() >=
    gateway.start + registrySettings.minGatewayJoinLength;
  const isActiveOrHidden =
    isGatewayJoined({ gateway, currentBlockHeight }) ||
    isGatewayHidden({ gateway });
  return joinedForMinimum && isActiveOrHidden;
}

export function calculateYearsBetweenTimestamps({
  startTimestamp,
  endTimestamp,
}: {
  startTimestamp: BlockTimestamp;
  endTimestamp: BlockTimestamp;
}): number {
  const yearsRemainingFloat =
    (endTimestamp.valueOf() - startTimestamp.valueOf()) / SECONDS_IN_A_YEAR;
  return +yearsRemainingFloat.toFixed(2);
}

// Unsafe because it does not check if the balance exists or is sufficient
export function unsafeDecrementBalance(
  balances: Balances,
  address: WalletAddress,
  amount: number,
  removeIfZero = true,
): void {
  balances[address] -= amount;
  if (removeIfZero && balances[address] === 0) {
    delete balances[address];
  }
}

export function incrementBalance(
  balances: Balances,
  address: WalletAddress,
  amount: number,
): void {
  if (amount < 0) {
    throw new ContractError(`Amount must be positive!`);
  }
  if (address in balances) {
    balances[address] += amount;
  } else {
    balances[address] = amount;
  }
}

export function safeTransfer({
  balances,
  fromAddr,
  toAddr,
  qty,
}: {
  balances: Balances;
  fromAddr: WalletAddress;
  toAddr: WalletAddress;
  qty: number;
}): void {
  if (qty < 0) {
    throw new ContractError(`Quantity must be positive!`);
  }

  if (fromAddr === toAddr) {
    throw new ContractError(INVALID_TARGET_MESSAGE);
  }

  if (balances[fromAddr] === null || isNaN(balances[fromAddr])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, fromAddr, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  incrementBalance(balances, toAddr, qty);
  unsafeDecrementBalance(balances, fromAddr, qty);
}
