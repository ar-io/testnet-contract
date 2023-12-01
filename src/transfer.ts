import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_TARGET_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
} from './constants';
import { Balances, TokenVault, WalletAddress } from './types';
import {
  incrementBalance,
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from './utilities';

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

export function safeTransferLocked({
  balances,
  vaults,
  fromAddr,
  toAddr,
  qty,
  lockLength,
}: {
  balances: Balances;
  vaults: {
    [address: string]: TokenVault[];
  };
  fromAddr: WalletAddress;
  toAddr: WalletAddress;
  qty: number;
  lockLength: number;
}): void {
  if (qty < 0) {
    throw new ContractError(`Quantity must be positive!`);
  }

  if (balances[fromAddr] === null || isNaN(balances[fromAddr])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, fromAddr, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (
    lockLength < MIN_TOKEN_LOCK_LENGTH ||
    lockLength > MAX_TOKEN_LOCK_LENGTH
  ) {
    throw new ContractError(
      `lockLength is out of range. lockLength must be between ${MIN_TOKEN_LOCK_LENGTH} - ${MAX_TOKEN_LOCK_LENGTH}.`,
    );
  }

  const start = +SmartWeave.block.height;
  const end = start + lockLength;
  if (toAddr in vaults) {
    // Address already exists in vaults, add a new vault
    vaults[toAddr].push({
      balance: qty,
      end,
      start,
    });
  } else {
    // Address is vaulting tokens for the first time
    vaults[toAddr] = [
      {
        balance: qty,
        end,
        start,
      },
    ];
  }
  unsafeDecrementBalance(balances, fromAddr, qty);
}
