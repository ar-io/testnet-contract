import {
  ARNS_NAME_RESERVED_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
  TOTAL_IO_SUPPLY,
} from './constants';
import {
  ArNSAuctionData,
  ArNSLeaseData,
  ArNSNameData,
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  Gateway,
  Gateways,
  IOState,
  IOToken,
  Records,
  RegistrationType,
  RegistryVaults,
  ReservedNameData,
  ReservedNames,
  VaultData,
  Vaults,
  WalletAddress,
} from './types';

export function walletHasSufficientBalance(
  balances: DeepReadonly<Balances>,
  wallet: string,
  qty: number, // TODO: change to IOToken
): boolean {
  return !!balances[wallet] && balances[wallet] >= qty;
}

export function resetProtocolBalance({
  balances,
  auctions,
  vaults,
  gateways,
}: {
  balances: DeepReadonly<Balances>;
  auctions: DeepReadonly<Auctions>;
  vaults: DeepReadonly<RegistryVaults>;
  gateways: DeepReadonly<Gateways>;
}): Pick<IOState, 'balances'> {
  const updatedBalances: Balances = {};
  // balances
  const totalBalances = Object.values(balances).reduce(
    (total: number, current: number) => total + current,
    0,
  );

  // gateway stakes
  const totalGatewayStaked = Object.values(gateways).reduce(
    (totalGatewaysStake: number, gateway: Gateway) => {
      const gatewayStake =
        gateway.operatorStake +
        Object.values(gateway.vaults).reduce(
          (totalVaulted: number, currentVault: VaultData) =>
            totalVaulted + currentVault.balance,
          0,
        );
      return totalGatewaysStake + gatewayStake;
    },
    0,
  );

  // active auctions
  const totalAuctionStake = Object.values(auctions).reduce(
    (totalAuctionStake: number, auction: ArNSAuctionData) => {
      return totalAuctionStake + auction.floorPrice;
    },
    0,
  );

  // vaults
  const totalVaultedStake = Object.values(vaults).reduce(
    (totalVaulted: number, vault: Vaults) => {
      return (
        totalVaulted +
        Object.values(vault).reduce(
          (totalAddressVaulted: number, currentVault: VaultData) =>
            currentVault.balance + totalAddressVaulted,
          0,
        )
      );
    },
    0,
  );

  const totalContractIO =
    totalBalances + totalGatewayStaked + totalAuctionStake + totalVaultedStake;

  const diff = TOTAL_IO_SUPPLY - totalContractIO;

  if (diff > 0) {
    updatedBalances[SmartWeave.contract.id] =
      balances[SmartWeave.contract.id] + diff;
  }

  const newBalances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  return {
    balances: newBalances,
  };
}

export function isNameInGracePeriod({
  currentBlockTimestamp,
  record,
}: {
  currentBlockTimestamp: BlockTimestamp;
  record: ArNSLeaseData;
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
  record: ArNSLeaseData;
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

export function isExistingActiveRecord({
  record,
  currentBlockTimestamp,
}: {
  record: ArNSNameData | undefined;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  if (!record) return false;

  if (record.type === 'permabuy') {
    return true;
  }

  if (record.type === 'lease' && record.endTimestamp) {
    return (
      record.endTimestamp > currentBlockTimestamp.valueOf() ||
      isNameInGracePeriod({ currentBlockTimestamp, record })
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
  auction: ArNSAuctionData;
  submittedBid: number | undefined; // TODO: change to IOToken
  requiredMinimumBid: IOToken; // TODO: change to IOToken
}): IOToken {
  if (submittedBid && submittedBid < requiredMinimumBid.valueOf()) {
    throw new ContractError(
      `The bid (${submittedBid} IO) is less than the current required minimum bid of ${requiredMinimumBid.valueOf()} IO.`,
    );
  }

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
  return (
    gateway?.status === 'joined' &&
    gateway?.start <= currentBlockHeight.valueOf()
  );
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
  minimumGatewayJoinLength,
}: {
  gateway: DeepReadonly<Gateway> | undefined;
  currentBlockHeight: BlockHeight;
  minimumGatewayJoinLength: BlockHeight;
}): boolean {
  if (!gateway) return false;
  const joinedForMinimum =
    currentBlockHeight.valueOf() >=
    gateway.start + minimumGatewayJoinLength.valueOf();
  const isActive = isGatewayJoined({ gateway, currentBlockHeight });
  return joinedForMinimum && isActive;
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
  amount: number, // TODO: change to IOToken
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
  amount: number, // TODO: change to IO token
): void {
  if (amount < 1) {
    throw new ContractError(`"Amount must be positive`);
  }
  if (address in balances) {
    balances[address] += amount;
  } else {
    balances[address] = amount;
  }
}

export function isLeaseRecord(record: ArNSNameData): record is ArNSLeaseData {
  return record.type === 'lease';
}
