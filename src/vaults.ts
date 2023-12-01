import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
} from './constants';
import { safeTransferLocked } from './transfer';
import { Balances, Vaults, WalletAddress } from './types';
import {
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from './utilities';

export function safeCreateVault({
  balances,
  vaults,
  address,
  qty,
  lockLength,
}: {
  balances: Balances;
  vaults: Vaults;
  address: WalletAddress;
  qty: number;
  lockLength: number;
}): void {
  // Transfer tokens into this address's own vault
  safeTransferLocked({
    balances,
    vaults,
    fromAddr: address,
    toAddr: address,
    qty,
    lockLength,
  });
}

export function safeExtendVault({
  vaults,
  address,
  index,
  lockLength,
}: {
  vaults: Vaults;
  address: WalletAddress;
  index: number;
  lockLength: number;
}): void {
  if (!Number.isInteger(index) || index < 0) {
    throw new ContractError(
      'Invalid value for "index". Must be an integer greater than or equal to 0',
    );
  }

  if (address in vaults) {
    if (!vaults[address][index]) {
      throw new ContractError('Invalid vault ID.');
    } else if (+SmartWeave.block.height >= vaults[address][index].end) {
      throw new ContractError('This vault has ended.');
    }
  } else {
    throw new ContractError('Caller does not have a vault.');
  }

  if (
    !Number.isInteger(lockLength) ||
    lockLength < MIN_TOKEN_LOCK_LENGTH ||
    lockLength > MAX_TOKEN_LOCK_LENGTH
  ) {
    throw new ContractError(
      `lockLength is out of range. lockLength must be between ${MIN_TOKEN_LOCK_LENGTH} - ${MAX_TOKEN_LOCK_LENGTH} blocks.`,
    );
  }

  const newEnd = vaults[address][index].end + lockLength;
  if (newEnd - +SmartWeave.block.height > MAX_TOKEN_LOCK_LENGTH) {
    throw new ContractError(
      `The new end height is out of range. Tokens cannot be locked for longer than ${MAX_TOKEN_LOCK_LENGTH} blocks.`,
    );
  }
  vaults[address][index].end = newEnd;
}

export function safeIncreaseVault({
  balances,
  vaults,
  address,
  index,
  qty,
}: {
  balances: Balances;
  vaults: Vaults;
  address: WalletAddress;
  index: number;
  qty: number;
}): void {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError(
      'Invalid value for "qty". Must be an integer greater than 0',
    );
  }

  if (balances[address] === null || isNaN(balances[address])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, address, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (!Number.isInteger(index) || index < 0) {
    throw new ContractError(
      'Invalid value for "index". Must be an integer greater than or equal to 0',
    );
  }

  if (address in vaults) {
    if (!vaults[address][index]) {
      throw new ContractError('Invalid vault ID.');
    } else if (+SmartWeave.block.height >= vaults[address][index].end) {
      throw new ContractError('This vault has ended.');
    }
  } else {
    throw new ContractError('Caller does not have a vault.');
  }

  vaults[address][index].balance += qty;
  unsafeDecrementBalance(balances, address, qty);
}
