import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
} from './constants';
import {
  Balances,
  BlockHeight,
  PositiveFiniteInteger,
  RegistryVaults,
  TransactionId,
  VaultData,
  WalletAddress,
} from './types';
import {
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from './utilities';

export function safeCreateVault({
  balances,
  vaults,
  address,
  qty,
  id,
  lockLength,
  startHeight,
}: {
  balances: Balances;
  vaults: RegistryVaults;
  id: TransactionId;
  address: WalletAddress;
  qty: PositiveFiniteInteger;
  lockLength: BlockHeight;
  startHeight: BlockHeight;
}): void {
  if (!walletHasSufficientBalance(balances, address, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (vaults[address] && id in vaults[address]) {
    throw new Error(`Vault with id '${id}' already exists`);
  }

  if (
    lockLength.valueOf() < MIN_TOKEN_LOCK_LENGTH ||
    lockLength.valueOf() > MAX_TOKEN_LOCK_LENGTH
  ) {
    throw new ContractError(
      `lockLength is out of range. lockLength must be between ${MIN_TOKEN_LOCK_LENGTH} - ${MAX_TOKEN_LOCK_LENGTH}.`,
    );
  }

  const end = startHeight.valueOf() + lockLength.valueOf();
  const newVault: VaultData = {
    balance: qty.valueOf(),
    start: startHeight.valueOf(),
    end,
  };
  vaults[address] = {
    ...vaults[address],
    [id]: newVault,
  };
  unsafeDecrementBalance(balances, address, qty.valueOf());
}

export function safeExtendVault({
  vaults,
  address,
  id,
  extendLength,
}: {
  vaults: RegistryVaults;
  address: WalletAddress;
  id: string;
  extendLength: PositiveFiniteInteger;
}): void {
  if (!vaults[address] || !(id in vaults[address])) {
    throw new ContractError('Invalid vault ID.');
  }

  if (+SmartWeave.block.height >= vaults[address][id].end) {
    throw new ContractError('This vault has ended.');
  }

  const currentEnd = vaults[address][id].end;
  const totalBlocksRemaining = currentEnd - +SmartWeave.block.height;

  if (
    extendLength.valueOf() < MIN_TOKEN_LOCK_LENGTH ||
    extendLength.valueOf() > MAX_TOKEN_LOCK_LENGTH ||
    totalBlocksRemaining + extendLength.valueOf() > MAX_TOKEN_LOCK_LENGTH
  ) {
    throw new ContractError(
      `lockLength is out of range. lockLength must be between ${MIN_TOKEN_LOCK_LENGTH} - ${MAX_TOKEN_LOCK_LENGTH} blocks.`,
    );
  }

  const newEnd = currentEnd + extendLength.valueOf();
  vaults[address][id].end = newEnd;
}

export function safeIncreaseVault({
  balances,
  vaults,
  address,
  id,
  qty,
}: {
  balances: Balances;
  vaults: RegistryVaults;
  address: WalletAddress;
  id: TransactionId;
  qty: PositiveFiniteInteger;
}): void {
  if (!walletHasSufficientBalance(balances, address, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (!vaults[address] || !(id in vaults[address])) {
    throw new ContractError('Invalid vault ID.');
  }

  if (+SmartWeave.block.height >= vaults[address][id].end) {
    throw new ContractError('This vault has ended.');
  }

  vaults[address][id].balance += qty.valueOf();
  unsafeDecrementBalance(balances, address, qty.valueOf());
}
