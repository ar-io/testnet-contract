import { safeTransfer } from './utilities';

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
