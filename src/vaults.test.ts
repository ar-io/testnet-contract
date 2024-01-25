import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_VAULT_LOCK_LENGTH_MESSAGE,
  MAX_TOKEN_LOCK_BLOCK_LENGTH,
  MIN_TOKEN_LOCK_BLOCK_LENGTH,
} from './constants';
import { BlockHeight, PositiveFiniteInteger, RegistryVaults } from './types';
import { safeCreateVault, safeExtendVault, safeIncreaseVault } from './vaults';

describe('safeCreateVault function', () => {
  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve address %s",
    (balances, fromAddr) => {
      expect(() => {
        safeCreateVault({
          balances,
          qty: new PositiveFiniteInteger(1),
          address: fromAddr,
          vaults: {},
          id: 'new-vault-id',
          lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
          startHeight: new BlockHeight(0),
        });
      }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
    },
  );

  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      safeCreateVault({
        balances: { foo: 1, bar: 2 },
        qty: new PositiveFiniteInteger(2),
        address: 'foo',
        vaults: {},
        id: 'new-vault-id',
        lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
        startHeight: new BlockHeight(0),
      });
    }).toThrowError('Insufficient funds for this transaction.');
  });

  it('should throw an error if address already has a vault with the given address', () => {
    expect(() => {
      safeCreateVault({
        balances: { foo: 1 },
        qty: new PositiveFiniteInteger(1),
        address: 'foo',
        vaults: {
          foo: {
            'existing-vault-id': {
              balance: 1,
              end: 100,
              start: 0,
            },
          },
        },
        id: 'existing-vault-id',
        lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
        startHeight: new BlockHeight(0),
      });
    }).toThrowError("Vault with id 'existing-vault-id' already exists");
  });

  it.each([
    0,
    MIN_TOKEN_LOCK_BLOCK_LENGTH - 1,
    MAX_TOKEN_LOCK_BLOCK_LENGTH + 1,
  ])('should throw an error if lock length is invalid %s', (lockLength) => {
    expect(() => {
      const balances = { foo: 2, bar: 2 };
      safeCreateVault({
        balances,
        qty: new PositiveFiniteInteger(1),
        address: 'foo',
        vaults: {},
        lockLength: new BlockHeight(lockLength),
        id: 'new-vault-id',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INVALID_VAULT_LOCK_LENGTH_MESSAGE);
  });

  it('should create vault in address with qty and lock length, and decrement address, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: RegistryVaults = {};
    const qty = new PositiveFiniteInteger(1);
    const address = 'foo';
    const id = 'new-vault-id';
    safeCreateVault({
      balances,
      qty,
      id: 'new-vault-id',
      address,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      startHeight: new BlockHeight(0),
    });

    const expectedVault = {
      balance: qty.valueOf(),
      start: 0,
      end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
    };
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[address][id]).toEqual(expectedVault);
  });

  it('should create new vault with other vaults', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: RegistryVaults = {
      ['foo']: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
    };
    const qty = new PositiveFiniteInteger(1);
    const address = 'bar';
    const expectedNewVault = {
      balance: qty.valueOf(),
      start: 0,
      end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
    };
    safeCreateVault({
      balances,
      qty,
      id: 'new-vault-id',
      address,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      startHeight: new BlockHeight(0),
    });
    expect(balances).toEqual({ foo: 2, bar: 1 });
    expect(vaults[address]['new-vault-id']).toEqual(expectedNewVault);
  });

  it('should create a second vault in address with qty and lock length, and decrement address, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const qty = new PositiveFiniteInteger(1);
    const address = 'foo';
    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
    };
    const newVault = {
      balance: qty.valueOf(),
      start: 0,
      end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
    };
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      id: 'new-vault-id',
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      startHeight: new BlockHeight(0),
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[address]['new-vault-id']).toEqual(newVault);
  });

  it('should create a third vault in address with qty and lockLength, and decrement address, by qty in balances object', () => {
    const balances = { foo: 4, bar: 2 };
    const qty = new PositiveFiniteInteger(3);
    const address = 'foo';

    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-1': {
          balance: 1,
          end: 100,
          start: 0,
        },
        'existing-vault-2': {
          balance: 2,
          end: 200,
          start: 0,
        },
      },
    };
    const newVaultData = {
      balance: qty.valueOf(),
      start: 0,
      end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
    };
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      id: 'new-vault-id',
      startHeight: new BlockHeight(0),
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[address]['new-vault-id']).toEqual(newVaultData);
  });

  it('should create vault in address with qty and lockLength and remove fully decremented address balance', () => {
    const balances = { foo: 1, bar: 2 };
    const vaults: RegistryVaults = {};
    const qty = new PositiveFiniteInteger(1);
    const address = 'foo';
    const newVaultData = {
      balance: qty.valueOf(),
      start: 0,
      end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
    };
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      id: 'new-vault-id',
      startHeight: new BlockHeight(0),
    });
    expect(balances).toEqual({ bar: 2 });
    expect(vaults[address]['new-vault-id']).toEqual(newVaultData);
  });
});

describe('safeExtendVault function', () => {
  it('should throw an error if no vaults exist', () => {
    expect(() => {
      safeExtendVault({
        vaults: {},
        address: 'bar',
        id: 'non-existent-vault',
        extendLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw an error if vault id does not exist', () => {
    expect(() => {
      const address = 'bar';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 100,
            start: 0,
          },
        },
      };
      safeExtendVault({
        vaults,
        address,
        id: 'non-existent-vault-id',
        extendLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw an error if vault id is invalid', () => {
    expect(() => {
      safeExtendVault({
        vaults: {},
        address: 'bar',
        id: 'non-existent-vault',
        extendLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      });
    }).toThrowError('Invalid vault ID.');
  });

  it.each([
    0,
    MIN_TOKEN_LOCK_BLOCK_LENGTH - 1,
    MAX_TOKEN_LOCK_BLOCK_LENGTH + 1,
  ])('should throw an error if lockLength is invalid %s', (extendLength) => {
    expect(() => {
      const address = 'bar';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 100,
            start: 0,
          },
        },
      };
      safeExtendVault({
        vaults,
        address,
        id: 'existing-vault-id',
        extendLength: new BlockHeight(extendLength),
      });
    }).toThrowError(INVALID_VAULT_LOCK_LENGTH_MESSAGE);
  });

  it('should throw error if vault has already ended', () => {
    expect(() => {
      const address = 'bar';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 0,
            start: 0,
          },
        },
      };
      safeExtendVault({
        vaults,
        address,
        id: 'existing-vault-id',
        extendLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
      });
    }).toThrowError('This vault has ended.');
  });

  it('should extend vault by lockLength', () => {
    const address = 'bar';
    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
    };
    const expectedNewVaultData = {
      balance: 1,
      end: 100 + MIN_TOKEN_LOCK_BLOCK_LENGTH,
      start: 0,
    };
    safeExtendVault({
      vaults,
      address,
      id: 'existing-vault-id',
      extendLength: new BlockHeight(MIN_TOKEN_LOCK_BLOCK_LENGTH),
    });
    expect(vaults[address]['existing-vault-id']).toEqual(expectedNewVaultData);
  });

  it('should extend vault to the max lockLength', () => {
    const currentEnd = 100;
    const address = 'bar';
    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-id': {
          balance: 1,
          end: currentEnd,
          start: 0,
        },
      },
    };
    const expectedNewVaultData = {
      balance: 1,
      end: MAX_TOKEN_LOCK_BLOCK_LENGTH,
      start: 0,
    };
    safeExtendVault({
      vaults,
      address,
      id: 'existing-vault-id',
      extendLength: new BlockHeight(MAX_TOKEN_LOCK_BLOCK_LENGTH - currentEnd),
    });
    expect(vaults[address]['existing-vault-id']).toEqual(expectedNewVaultData);
  });
});

describe('safeIncreaseVault function', () => {
  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      const address = 'foo';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 100,
            start: 0,
          },
        },
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        id: 'existing-vault-id',
        qty: new PositiveFiniteInteger(2),
        address,
        vaults,
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should throw an error if id is invalid', () => {
    expect(() => {
      const address = 'foo';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 100,
            start: 0,
          },
        },
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address: 'bar',
        id: 'existing-vault-id',
        qty: new PositiveFiniteInteger(1),
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw an error if caller does not have a vault', () => {
    expect(() => {
      const vaults: RegistryVaults = {};
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address: 'bar',
        id: 'vault-does-not-exist',
        qty: new PositiveFiniteInteger(1),
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw an error if vault does not exist', () => {
    expect(() => {
      const address = 'foo';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 100,
            start: 0,
          },
        },
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address,
        id: 'non-existent-vault-id',
        qty: new PositiveFiniteInteger(1),
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw error if vault has already ended', () => {
    expect(() => {
      const address = 'bar';
      const vaults: RegistryVaults = {
        [address]: {
          'existing-vault-id': {
            balance: 1,
            end: 0,
            start: 0,
          },
        },
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address,
        id: 'existing-vault-id',
        qty: new PositiveFiniteInteger(1),
      });
    }).toThrowError('This vault has ended.');
  });

  it('should increase existing vault', () => {
    const address = 'bar';
    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
    };
    const balances = { foo: 1, bar: 2 };
    const expectedNewVaultData = {
      balance: 2,
      end: 100,
      start: 0,
    };
    safeIncreaseVault({
      balances,
      vaults,
      id: 'existing-vault-id',
      qty: new PositiveFiniteInteger(1),
      address,
    });
    expect(balances).toEqual({ foo: 1, bar: 1 });
    expect(vaults[address]['existing-vault-id']).toEqual(expectedNewVaultData);
  });
});
