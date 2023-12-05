import { MAX_TOKEN_LOCK_LENGTH, MIN_TOKEN_LOCK_LENGTH } from './constants';
import { TokenVault } from './types';
import { safeCreateVault, safeExtendVault, safeIncreaseVault } from './vaults';

describe('safeCreateVault function', () => {
  it('should throw an error if quantity is negative', () => {
    expect(() => {
      safeCreateVault({
        balances: { foo: 1, bar: 2 },
        qty: -1,
        address: 'foo',
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
    "should throw an error if balances %p can't be used to retrieve address %s",
    (balances, fromAddr) => {
      expect(() => {
        safeCreateVault({
          balances,
          qty: 1,
          address: fromAddr,
          vaults: {},
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      safeCreateVault({
        balances: { foo: 1, bar: 2 },
        qty: 2,
        address: 'foo',
        vaults: {},
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError('Insufficient funds for this transaction.');
  });

  it.each([0, -1, MIN_TOKEN_LOCK_LENGTH - 1, MAX_TOKEN_LOCK_LENGTH + 1])(
    'should throw an error if lock length is invalid %s',
    (lockLength) => {
      expect(() => {
        const balances = { foo: 2, bar: 2 };
        safeCreateVault({
          balances,
          qty: 1,
          address: 'foo',
          vaults: {},
          lockLength,
        });
      }).toThrowError(/lockLength is out of range/);
    },
  );

  it('should create vault in address with qty and lock length, and decrement address, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: {
      [address: string]: TokenVault[];
    } = {};
    const qty = 1;
    const address = 'foo';
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[address][0].balance).toEqual(qty);
  });

  it('should create new vault with other vaults', () => {
    const balances = { foo: 2, bar: 2 };
    const vaults: {
      [address: string]: TokenVault[];
    } = {
      ['foo']: [
        {
          balance: 1,
          end: 100,
          start: 0,
        },
      ],
    };
    const qty = 1;
    const address = 'bar';
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 2, bar: 1 });
    expect(vaults[address][0].balance).toEqual(qty);
  });

  it('should create a second vault in address with qty and locklength, and decrement address, by qty in balances object', () => {
    const balances = { foo: 2, bar: 2 };
    const qty = 1;
    const address = 'foo';

    const vaults: {
      [address: string]: TokenVault[];
    } = {
      [address]: [
        {
          balance: 1,
          end: 100,
          start: 0,
        },
      ],
    };
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[address][vaults[address].length - 1].balance).toEqual(qty);
    expect(vaults[address][vaults[address].length - 1].end).toEqual(
      MIN_TOKEN_LOCK_LENGTH + 1,
    );
  });

  it('should create a third vault in address with qty and lockLength, and decrement address, by qty in balances object', () => {
    const balances = { foo: 4, bar: 2 };
    const qty = 3;
    const address = 'foo';

    const vaults: {
      [address: string]: TokenVault[];
    } = {
      [address]: [
        {
          balance: 1,
          end: 100,
          start: 0,
        },
        {
          balance: 2,
          end: 200,
          start: 0,
        },
      ],
    };
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ foo: 1, bar: 2 });
    expect(vaults[address][vaults[address].length - 1].balance).toEqual(qty);
    expect(vaults[address][vaults[address].length - 1].end).toEqual(
      MIN_TOKEN_LOCK_LENGTH + 1,
    );
  });

  it('should create vault in address with qty and lockLength and remove fully decremented address balance', () => {
    const balances = { foo: 1, bar: 2 };
    const vaults: {
      [address: string]: TokenVault[];
    } = {};
    const qty = 1;
    const address = 'foo';
    safeCreateVault({
      balances,
      qty,
      address,
      vaults,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(balances).toEqual({ bar: 2 });
    expect(vaults[address][0].balance).toEqual(qty);
  });
});

describe('safeExtendVault function', () => {
  it('should throw an error if no vaults exist', () => {
    expect(() => {
      safeExtendVault({
        vaults: {},
        address: 'bar',
        index: 0,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError('Caller does not have a vault.');
  });

  it('should throw an error if vault id does not exist', () => {
    expect(() => {
      const address = 'bar';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeExtendVault({
        vaults,
        address,
        index: vaults[address].length + 1,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw an error if vault id is invalid', () => {
    expect(() => {
      safeExtendVault({
        vaults: {},
        address: 'bar',
        index: -1,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError(
      'Invalid value for "index". Must be an integer greater than or equal to 0',
    );
  });

  it.each([0, -1, MIN_TOKEN_LOCK_LENGTH - 1, MAX_TOKEN_LOCK_LENGTH + 1])(
    'should throw an error if lockLength is invalid %s',
    (lockLength) => {
      expect(() => {
        const address = 'bar';
        const vaults: {
          [address: string]: TokenVault[];
        } = {
          [address]: [
            {
              balance: 1,
              end: 100,
              start: 0,
            },
          ],
        };
        safeExtendVault({
          vaults,
          address,
          index: 0,
          lockLength,
        });
      }).toThrowError(/lockLength is out of range/);
    },
  );

  it('should throw error if lock length is too long', () => {
    expect(() => {
      const address = 'bar';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeExtendVault({
        vaults,
        address,
        index: 0,
        lockLength: MAX_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError(/The new end height is out of range/);
  });

  it('should throw error if vault has already ended', () => {
    expect(() => {
      const address = 'bar';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 0,
            start: 0,
          },
        ],
      };
      safeExtendVault({
        vaults,
        address,
        index: 0,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
    }).toThrowError('This vault has ended.');
  });

  it('should extend vault by lockLength', () => {
    const address = 'bar';
    const vaults: {
      [address: string]: TokenVault[];
    } = {
      [address]: [
        {
          balance: 1,
          end: 100,
          start: 0,
        },
      ],
    };
    safeExtendVault({
      vaults,
      address,
      index: 0,
      lockLength: MIN_TOKEN_LOCK_LENGTH,
    });
    expect(vaults[address][0].end).toEqual(100 + MIN_TOKEN_LOCK_LENGTH);
  });

  it('should extend vault to the max lockLength', () => {
    const end = 100;
    const address = 'bar';
    const vaults: {
      [address: string]: TokenVault[];
    } = {
      [address]: [
        {
          balance: 1,
          end,
          start: 0,
        },
      ],
    };
    safeExtendVault({
      vaults,
      address,
      index: 0,
      lockLength: MAX_TOKEN_LOCK_LENGTH - end,
    });
    expect(vaults[address][0].end).toEqual(100 + (MAX_TOKEN_LOCK_LENGTH - end));
  });
});

describe('safeIncreaseVault function', () => {
  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve fromAddr %s",
    (balances, fromAddr) => {
      expect(() => {
        const address = 'bar';
        const vaults: {
          [address: string]: TokenVault[];
        } = {
          [address]: [
            {
              balance: 1,
              end: 100,
              start: 0,
            },
          ],
        };
        safeIncreaseVault({
          balances,
          index: 0,
          qty: 1,
          address: fromAddr,
          vaults,
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      const address = 'foo';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        index: 0,
        qty: 2,
        address,
        vaults,
      });
    }).toThrowError('Insufficient funds for this transaction.');
  });

  it('should throw an error if qty is invalid', () => {
    expect(() => {
      const address = 'foo';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address: 'bar',
        index: 0,
        qty: -1,
      });
    }).toThrowError(
      'Invalid value for "qty". Must be an integer greater than 0',
    );
  });

  it('should throw an error if id is invalid', () => {
    expect(() => {
      const address = 'foo';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address: 'bar',
        index: -1,
        qty: 1,
      });
    }).toThrowError(
      'Invalid value for "index". Must be an integer greater than or equal to 0',
    );
  });

  it('should throw an error if caller does not have a vault', () => {
    expect(() => {
      const address = 'foo';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address: 'bar',
        index: vaults[address].length + 1,
        qty: 1,
      });
    }).toThrowError('Caller does not have a vault.');
  });

  it('should throw an error if vault does not exist', () => {
    expect(() => {
      const address = 'foo';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 100,
            start: 0,
          },
        ],
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address,
        index: vaults[address].length + 1,
        qty: 1,
      });
    }).toThrowError('Invalid vault ID.');
  });

  it('should throw error if vault has already ended', () => {
    expect(() => {
      const address = 'bar';
      const vaults: {
        [address: string]: TokenVault[];
      } = {
        [address]: [
          {
            balance: 1,
            end: 0,
            start: 0,
          },
        ],
      };
      safeIncreaseVault({
        balances: { foo: 1, bar: 2 },
        vaults,
        address,
        index: 0,
        qty: 1,
      });
    }).toThrowError('This vault has ended.');
  });

  it('should increase existing vault', () => {
    const address = 'bar';
    const vaults: {
      [address: string]: TokenVault[];
    } = {
      [address]: [
        {
          balance: 1,
          end: 100,
          start: 0,
        },
      ],
    };
    const balances = { foo: 1, bar: 2 };
    safeIncreaseVault({
      balances,
      vaults,
      index: 0,
      qty: 1,
      address,
    });
    expect(balances).toEqual({ foo: 1, bar: 1 });
    expect(vaults[address][vaults[address].length - 1].balance).toEqual(2);
  });
});
