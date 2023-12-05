import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
} from './constants';
import { safeTransfer, safeTransferLocked } from './transfer';
import { TokenVault } from './types';

describe('safeTransfer function', () => {
  it('should throw an error if quantity is negative', () => {
    expect(() => {
      safeTransfer({
        balances: { foo: 1, bar: 2 },
        qty: -1,
        fromAddr: 'foo',
        toAddr: 'bar',
      });
    }).toThrowError('Quantity must be positive');
  });

  it('should throw an error if fromAddr is the same as toAddr', () => {
    expect(() => {
      safeTransfer({
        balances: { foo: 1, bar: 2 },
        qty: 1,
        fromAddr: 'foo',
        toAddr: 'foo',
      });
    }).toThrowError('Invalid target specified');
  });

  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve fromAddr %s",
    (balances, fromAddr) => {
      expect(() => {
        safeTransfer({
          balances,
          qty: 1,
          fromAddr,
          toAddr: 'biz',
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if fromAddr does not have enough balance', () => {
    expect(() => {
      safeTransfer({
        balances: { foo: 1, bar: 2 },
        qty: 2,
        fromAddr: 'foo',
        toAddr: 'bar',
      });
    }).toThrowError('Insufficient funds for this transaction.');
  });

  it('should increment toAddr balance, and decrement fromAddr, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = 'bar';
    safeTransfer({
      balances,
      qty,
      fromAddr,
      toAddr,
    });
    expect(balances).toEqual({ foo: 1, bar: 3 });
  });

  it('should create and increment toAddr balance, and decrement fromAddr, by qty in balances object', () => {
    const balances = { foo: 2 };
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = 'bar';
    safeTransfer({
      balances,
      qty,
      fromAddr,
      toAddr,
    });
    expect(balances).toEqual({ foo: 1, bar: 1 });
  });

  it('should increment toAddr balance in balances object by qty and remove fully decremented fromAddr balance', () => {
    const balances = { foo: 1, bar: 2 };
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = 'bar';
    safeTransfer({
      balances,
      qty,
      fromAddr,
      toAddr,
    });
    expect(balances).toEqual({ bar: 3 });
  });
});

describe('safeTransferLocked function', () => {
  it('should throw an error if quantity is negative', () => {
    expect(() => {
      safeTransferLocked({
        balances: { foo: 1, bar: 2 },
        qty: -1,
        fromAddr: 'foo',
        toAddr: 'bar',
        vaults: {},
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError('Quantity must be positive!');
  });

  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve fromAddr %s",
    (balances, fromAddr) => {
      expect(() => {
        safeTransferLocked({
          balances,
          qty: 1,
          fromAddr,
          toAddr: 'biz',
          vaults: {},
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if fromAddr does not have enough balance', () => {
    expect(() => {
      safeTransferLocked({
        balances: { foo: 1, bar: 2 },
        qty: 2,
        fromAddr: 'foo',
        toAddr: 'bar',
        vaults: {},
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it.each([0, -1, MAX_TOKEN_LOCK_LENGTH + 1])(
    'should throw an error if lock length is invalid %s',
    (lockLength) => {
      expect(() => {
        const balances = { foo: 2, bar: 2 };
        safeTransferLocked({
          balances,
          qty: 1,
          fromAddr: 'foo',
          toAddr: 'biz',
          vaults: {},
          lockLength,
        });
      }).toThrowError(/lockLength is out of range/);
    },
  );

  it('should create vault in toAddr with qty and lock length, and decrement fromAddr, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: {
      // a list of all vaults that have locked balances
      [address: string]: TokenVault[];
      // a wallet can have multiple vaults
    } = {};
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = 'bar';
    safeTransferLocked({
      balances,
      qty,
      fromAddr,
      toAddr,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[toAddr][0].balance).toEqual(qty);
  });

  it('should create a second vault in toAddr with qty and locklength, and decrement fromAddr, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = 'bar';
    const vaults: {
      // a list of all vaults that have locked balances
      [address: string]: TokenVault[];
      // a wallet can have multiple vaults
    } = {
      [toAddr]: [
        {
          balance: 1,
          end: 100,
          start: 0,
        },
      ],
    };
    safeTransferLocked({
      balances,
      qty,
      fromAddr,
      toAddr,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[toAddr][vaults[toAddr].length - 1].balance).toEqual(qty);
    expect(vaults[toAddr][vaults[toAddr].length - 1].end).toEqual(
      MIN_TOKEN_LOCK_LENGTH + 1,
    );
  });

  it('should create vault in toAddr with qty and lock length and remove fully decremented fromAddr balance', () => {
    const balances = { foo: 1, bar: 2 };
    const vaults: {
      // a list of all vaults that have locked balances
      [address: string]: TokenVault[];
      // a wallet can have multiple vaults
    } = {};
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = 'bar';
    safeTransferLocked({
      balances,
      qty,
      fromAddr,
      toAddr,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ bar: 2 });
    expect(vaults[toAddr][0].balance).toEqual(qty);
  });

  it('should create vault in toAddr with qty and lock length, and decrement fromAddr, by qty in balances object when they are both the same', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: {
      // a list of all vaults that have locked balances
      [address: string]: TokenVault[];
      // a wallet can have multiple vaults
    } = {};
    const qty = 1;
    const fromAddr = 'foo';
    const toAddr = fromAddr;
    safeTransferLocked({
      balances,
      qty,
      fromAddr,
      toAddr,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[toAddr][0].balance).toEqual(qty);
  });
});
