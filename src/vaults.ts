import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
} from './constants';
import { safeTransferLocked } from './transfer';
import { Balances, TokenVault, WalletAddress } from './types';
import {
  incrementBalance,
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
  vaults: {
    [address: string]: TokenVault[];
  };
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
  id,
  lockLength,
}: {
  vaults: {
    [address: string]: TokenVault[];
  };
  address: WalletAddress;
  id: number;
  lockLength: number;
}): void {
  if (!Number.isInteger(id) || id < 0) {
    throw new ContractError(
      'Invalid value for "id". Must be an integer greater than or equal to 0',
    );
  }

  if (address in vaults) {
    if (!vaults[address][id]) {
      throw new ContractError('Invalid vault ID.');
    } else if (+SmartWeave.block.height >= vaults[address][id].end) {
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

  const newEnd = vaults[address][id].end + lockLength;
  if (newEnd - +SmartWeave.block.height > MAX_TOKEN_LOCK_LENGTH) {
    throw new ContractError(
      `The new end height is out of range. Tokens cannot be locked for longer than ${MAX_TOKEN_LOCK_LENGTH} blocks.`,
    );
  }
  vaults[address][id].end = newEnd;
}

export function safeIncreaseVault({
  balances,
  vaults,
  address,
  id,
  qty,
}: {
  balances: {
    [address: string]: number;
  };
  vaults: {
    [address: string]: TokenVault[];
  };
  address: WalletAddress;
  id: number;
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

  if (!Number.isInteger(id) || id < 0) {
    throw new ContractError(
      'Invalid value for "id". Must be an integer greater than or equal to 0',
    );
  }

  if (address in vaults) {
    if (!vaults[address][id]) {
      throw new ContractError('Invalid vault ID.');
    } else if (+SmartWeave.block.height >= vaults[address][id].end) {
      throw new ContractError('This vault has ended.');
    }
  } else {
    throw new ContractError('Caller does not have a vault.');
  }

  vaults[address][id].balance += qty;
  unsafeDecrementBalance(balances, address, qty);
}

export function safeUnlockVaults({
  balances,
  vaults,
}: {
  balances: {
    [address: string]: number;
  };
  vaults: {
    [address: string]: TokenVault[];
  };
}): void {
  Object.keys(vaults).forEach((address) => {
    // Filter out vaults that have ended
    const activeVaults = vaults[address].filter((vault) => {
      if (vault.end <= +SmartWeave.block.height) {
        incrementBalance(balances, address, vault.balance);
        return false;
      }
      return true;
    });

    if (activeVaults.length === 0) {
      // If there are no active vaults left, delete the key from the vaults object
      delete vaults[address];
    } else {
      // Otherwise, update the vaults[address] with the filtered list
      vaults[address] = activeVaults;
    }
  });
}
