import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_TARGET_MESSAGE,
  INVALID_VAULT_LOCK_LENGTH_MESSAGE,
  MAX_TOKEN_LOCK_BLOCK_LENGTH,
  MIN_TOKEN_LOCK_BLOCK_LENGTH,
} from './constants';
import {
  Balances,
  BlockHeight,
  IOToken,
  RegistryVaults,
  TransactionId,
  VaultData,
  WalletAddress,
} from './types';
import {
  incrementBalance,
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from './utilities';

export function safeTransfer({
  balances,
  fromAddress,
  toAddress,
  qty,
}: {
  balances: Balances;
  fromAddress: WalletAddress;
  toAddress: WalletAddress;
  qty: number; // TODO: use IOToken
}): void {
  if (fromAddress === toAddress) {
    throw new ContractError(INVALID_TARGET_MESSAGE);
  }

  if (balances[fromAddress] === null || isNaN(balances[fromAddress])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, fromAddress, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  incrementBalance(balances, toAddress, qty);
  unsafeDecrementBalance(balances, fromAddress, qty);
}

export function safeVaultedTransfer({
  balances,
  vaults,
  fromAddress,
  toAddress,
  startHeight,
  id,
  qty,
  lockLength,
}: {
  balances: Balances;
  vaults: RegistryVaults;
  fromAddress: WalletAddress;
  toAddress: WalletAddress;
  id: TransactionId;
  qty: IOToken;
  startHeight: BlockHeight;
  lockLength: BlockHeight;
}): void {
  if (!walletHasSufficientBalance(balances, fromAddress, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (vaults[toAddress] && id in vaults[toAddress]) {
    throw new ContractError(`Vault with id '${id}' already exists`);
  }

  if (
    lockLength.valueOf() < MIN_TOKEN_LOCK_BLOCK_LENGTH ||
    lockLength.valueOf() > MAX_TOKEN_LOCK_BLOCK_LENGTH
  ) {
    throw new ContractError(INVALID_VAULT_LOCK_LENGTH_MESSAGE);
  }

  const newVault: VaultData = {
    balance: qty.valueOf(),
    start: startHeight.valueOf(),
    end: startHeight.valueOf() + lockLength.valueOf(),
  };

  // create the new vault
  vaults[toAddress] = {
    ...vaults[toAddress],
    [id]: newVault,
  };

  unsafeDecrementBalance(balances, fromAddress, qty.valueOf());
}
