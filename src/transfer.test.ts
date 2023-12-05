import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
} from './constants';
import { safeTransfer, safeVaultedTransfer } from './transfer';
import { BlockHeight, IOToken, RegistryVaults, VaultData } from './types';

describe('safeTransfer function', () => {
  it('should throw an error if fromAddress is the same as toAddress', () => {
    expect(() => {
      safeTransfer({
        balances: { foo: 1, bar: 2 },
        qty: 1,
        fromAddress: 'foo',
        toAddress: 'foo',
      });
    }).toThrowError('Invalid target specified');
  });

  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve fromAddress %s",
    (balances, fromAddress) => {
      expect(() => {
        safeTransfer({
          balances,
          qty: 1,
          fromAddress,
          toAddress: 'biz',
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if fromAddress does not have enough balance', () => {
    expect(() => {
      safeTransfer({
        balances: { foo: 1, bar: 2 },
        qty: 2,
        fromAddress: 'foo',
        toAddress: 'bar',
      });
    }).toThrowError('Insufficient funds for this transaction.');
  });

  it('should increment toAddress balance, and decrement fromAddress, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const fromAddress = 'foo';
    const toAddress = 'bar';
    safeTransfer({
      balances,
      qty: 1,
      fromAddress,
      toAddress,
    });
    expect(balances).toEqual({ foo: 1, bar: 3 });
  });

  it('should create and increment toAddress balance, and decrement fromAddress, by qty in balances object', () => {
    const balances = { foo: 2 };
    const fromAddress = 'foo';
    const toAddress = 'bar';
    safeTransfer({
      balances,
      qty: 1,
      fromAddress,
      toAddress,
    });
    expect(balances).toEqual({ foo: 1, bar: 1 });
  });

  it('should increment toAddress balance in balances object by qty and remove fully decremented fromAddress balance', () => {
    const balances = { foo: 1, bar: 2 };
    const fromAddress = 'foo';
    const toAddress = 'bar';
    safeTransfer({
      balances,
      qty: 1,
      fromAddress,
      toAddress,
    });
    expect(balances).toEqual({ bar: 3 });
  });
});

describe('safeVaultedTransfer function', () => {
  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve fromAddress %s",
    (balances, fromAddress) => {
      expect(() => {
        safeVaultedTransfer({
          balances,
          vaults: {},
          qty: new IOToken(1),
          fromAddress,
          id: 'new-vaulted-transfer',
          toAddress: 'biz',
          lockLength: new BlockHeight(MIN_TOKEN_LOCK_LENGTH),
          startHeight: new BlockHeight(0),
        });
      }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
    },
  );

  it('should throw an error if fromAddress does not have enough balance', () => {
    expect(() => {
      safeVaultedTransfer({
        balances: { foo: 0 },
        vaults: {},
        qty: new IOToken(1),
        fromAddress: 'foo',
        id: 'new-vaulted-transfer',
        toAddress: 'biz',
        lockLength: new BlockHeight(MIN_TOKEN_LOCK_LENGTH),
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it.each([0, MAX_TOKEN_LOCK_LENGTH + 1])(
    'should throw an error if lock length is invalid %s',
    (lockLength) => {
      expect(() => {
        const balances = { foo: 2, bar: 2 };
        safeVaultedTransfer({
          balances,
          vaults: {},
          qty: new IOToken(1),
          fromAddress: 'foo',
          id: 'new-vaulted-transfer',
          toAddress: 'biz',
          lockLength: new BlockHeight(lockLength),
          startHeight: new BlockHeight(0),
        });
      }).toThrowError(/lockLength is out of range/);
    },
  );

  it.only('should create vault in toAddress with qty and lock length, and decrement fromAddress, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: RegistryVaults = {};
    const qty = 1;
    const fromAddress = 'foo';
    const toAddress = 'bar';
    const expectedNewVaultData: VaultData = {
      balance: qty,
      start: 0,
      end: MIN_TOKEN_LOCK_LENGTH,
    };
    safeVaultedTransfer({
      balances,
      vaults: vaults,
      qty: new IOToken(1),
      fromAddress,
      id: 'new-vaulted-transfer',
      toAddress,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_LENGTH),
      startHeight: new BlockHeight(0),
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[toAddress]['new-vaulted-transfer']).toEqual(
      expectedNewVaultData,
    );
  });

  it('should create a second vault in toAddress with qty and lock length, and decrement fromAddress, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const qty = 1;
    const fromAddress = 'foo';
    const toAddress = 'bar';
    const vaults: RegistryVaults = {
      [toAddress]: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
    };
    const expectedNewVaultData: VaultData = {
      balance: qty,
      start: 0,
      end: MIN_TOKEN_LOCK_LENGTH,
    };
    safeVaultedTransfer({
      balances,
      qty: new IOToken(1),
      fromAddress,
      toAddress,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_LENGTH),
      startHeight: new BlockHeight(0),
      id: 'new-vaulted-transfer',
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[toAddress]['new-vaulted-transfer']).toEqual(
      expectedNewVaultData,
    );
  });

  it('should create vault in toAddress with qty and lock length and remove fully decremented fromAddress balance', () => {
    const balances = { foo: 1, bar: 2 };
    const vaults: RegistryVaults = {};
    const qty = 1;
    const fromAddress = 'foo';
    const toAddress = 'bar';
    safeVaultedTransfer({
      balances,
      qty: new IOToken(1),
      fromAddress,
      toAddress,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_LENGTH),
      startHeight: new BlockHeight(0),
      id: 'new-vaulted-transfer',
    });
    const expectedNewVaultData: VaultData = {
      balance: qty,
      start: 0,
      end: MIN_TOKEN_LOCK_LENGTH,
    };
    expect(balances).toEqual({ bar: 2 });
    expect(vaults[toAddress]['new-vaulted-address']).toEqual(
      expectedNewVaultData,
    );
  });

  it('should create vault in toAddress with qty and lock length, and decrement fromAddress, by qty in balances object when they are both the same', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: RegistryVaults = {};
    const qty = 1;
    const fromAddress = 'foo';
    const toAddress = fromAddress;
    safeVaultedTransfer({
      balances,
      qty: new IOToken(1),
      fromAddress,
      toAddress,
      vaults,
      lockLength: new BlockHeight(MIN_TOKEN_LOCK_LENGTH),
      startHeight: new BlockHeight(0),
      id: 'new-vaulted-transfer',
    });
    const expectedNewVaultData: VaultData = {
      balance: qty,
      start: 0,
      end: MIN_TOKEN_LOCK_LENGTH,
    };
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[toAddress]['new-vaulted-transfer']).toEqual(
      expectedNewVaultData,
    );
  });
});
