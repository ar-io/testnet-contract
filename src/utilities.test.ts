import { BlockTimestamp } from './types';
import {
  calculateYearsBetweenTimestamps,
  incrementBalance,
  safeTransfer,
  unsafeDecrementBalance,
} from './utilities';

describe('calculateYearsBetweenTimestamps function', () => {
  // Don't use the global constant in case someone changes it there
  //const SECONDS_IN_A_YEAR = 31_536_000;

  it.each([
    [new BlockTimestamp(0), new BlockTimestamp(0)],
    [new BlockTimestamp(1), new BlockTimestamp(1)],
    [
      new BlockTimestamp(Number.MAX_SAFE_INTEGER),
      new BlockTimestamp(Number.MAX_SAFE_INTEGER),
    ],
  ])(
    'should return 0 if the timestamps (start: %p, end: %p) are the same',
    (startTimestamp, endTimestamp) => {
      expect(
        calculateYearsBetweenTimestamps({
          startTimestamp,
          endTimestamp,
        }),
      ).toEqual(0);
    },
  );

  it.each([
    [new BlockTimestamp(0), new BlockTimestamp(157679), 0],
    [new BlockTimestamp(0), new BlockTimestamp(315359), 0.01],
    [new BlockTimestamp(0), new BlockTimestamp(315360), 0.01],
    [new BlockTimestamp(0), new BlockTimestamp(473040), 0.01],
    [new BlockTimestamp(0), new BlockTimestamp(473041), 0.02],
  ])(
    'should have two digits of precision (start: %p, end: %p)',
    (startTimestamp, endTimestamp, expectedValue) => {
      expect(
        calculateYearsBetweenTimestamps({
          startTimestamp,
          endTimestamp,
        }),
      ).toEqual(expectedValue);
    },
  );

  it.each([
    [new BlockTimestamp(0), new BlockTimestamp(31_536_000), 1],
    [new BlockTimestamp(31_536_000), new BlockTimestamp(0), -1],
  ])(
    'should return positive and negative values (start: %p, end: %p)',
    (startTimestamp, endTimestamp, expectedValue) => {
      expect(
        calculateYearsBetweenTimestamps({
          startTimestamp,
          endTimestamp,
        }),
      ).toEqual(expectedValue);
    },
  );
});

describe('unsafeDecrementBalance function', () => {
  it('should not throw an error if quantity is negative', () => {
    const balances = { foo: 1, bar: 2 };
    expect(() => {
      unsafeDecrementBalance(balances, 'foo', -1);
    }).not.toThrow();
    expect(balances).toEqual({ foo: 2, bar: 2 });
  });

  it('should not throw an error if address does not exist', () => {
    const balances = { foo: 1, bar: 2 };
    expect(() => {
      unsafeDecrementBalance(balances, 'baz', 1);
    }).not.toThrow();
    expect(balances).toEqual({ foo: 1, bar: 2, baz: Number.NaN });
  });

  it('should decrement balance of address if it exists', () => {
    const balances = { foo: 1, bar: 2 };
    unsafeDecrementBalance(balances, 'foo', 1);
    expect(balances).toEqual({ bar: 2 });
  });

  it('should decrement and remove balance of address if it exists and is fully drained', () => {
    const balances = { foo: 1, bar: 2 };
    unsafeDecrementBalance(balances, 'foo', 1);
    expect(balances).toEqual({ bar: 2 });
  });

  it('should decrement and not remove balance of address if it exists and is fully drained when removeIfZero is false', () => {
    const balances = { foo: 1, bar: 2 };
    unsafeDecrementBalance(balances, 'foo', 1, false);
    expect(balances).toEqual({ foo: 0, bar: 2 });
  });
});

describe('incrementBalance function', () => {
  it('should throw an error if quantity is negative', () => {
    expect(() => {
      incrementBalance({ foo: 1, bar: 2 }, 'foo', -1);
    }).toThrowError('Amount must be positive');
  });

  it('should add and increment balance of address if it does not yet exist', () => {
    const balances = { foo: 1, bar: 2 };
    incrementBalance(balances, 'baz', 1);
    expect(balances).toEqual({ foo: 1, bar: 2, baz: 1 });
  });

  it('should increment balance of address if it already exists', () => {
    const balances = { foo: 1, bar: 2 };
    incrementBalance(balances, 'foo', 1);
    expect(balances).toEqual({ foo: 2, bar: 2 });
  });
});

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
    [{ foo: 1, bar: 2 }, undefined],
    [{ foo: 1, bar: 2 }, null],
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
