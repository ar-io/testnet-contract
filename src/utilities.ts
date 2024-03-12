import {
  INVALID_INPUT_MESSAGE,
  SECONDS_IN_A_YEAR,
  TOTAL_IO_SUPPLY,
} from './constants';
import {
  ArNSAuctionData,
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  Gateway,
  Gateways,
  IOState,
  RegistryVaults,
  VaultData,
  Vaults,
  WalletAddress,
  mIOToken,
} from './types';

export function walletHasSufficientBalance(
  balances: DeepReadonly<Balances>,
  wallet: string,
  qty: mIOToken,
): boolean {
  return !!balances[wallet] && balances[wallet] >= qty.valueOf();
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
  amount: mIOToken,
  removeIfZero = true,
): void {
  balances[address] -= amount.valueOf();
  if (removeIfZero && balances[address] === 0) {
    delete balances[address];
  }
}

export function incrementBalance(
  balances: Balances,
  address: WalletAddress,
  amount: mIOToken,
): void {
  if (amount.valueOf() < 1) {
    throw new ContractError(`"Amount must be positive`);
  }
  if (address in balances) {
    const prevBalance = new mIOToken(balances[address]);
    const newBalance = prevBalance.plus(amount);
    balances[address] = newBalance.valueOf();
  } else {
    balances[address] = amount.valueOf();
  }
}
