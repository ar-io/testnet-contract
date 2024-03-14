import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  MAX_DELEGATES,
  MIN_DELEGATED_STAKE,
} from './constants';
import { safeDecreaseDelegateStake, safeDelegateStake } from './delegates';
import {
  createMockDelegates,
  stubbedArweaveTxId,
  stubbedGatewayData,
  stubbedGateways,
} from './tests/stubs';
import { BlockHeight, DelegateData, mIOToken } from './types';

describe('safeDelegateStake function', () => {
  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve address %s",
    (balances, fromAddr) => {
      expect(() => {
        safeDelegateStake({
          balances,
          gateways: stubbedGateways,
          qty: MIN_DELEGATED_STAKE,
          fromAddress: fromAddr,
          gatewayAddress: stubbedArweaveTxId,
          startHeight: new BlockHeight(0),
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: 1, bar: 2 },
        gateways: stubbedGateways,
        qty: MIN_DELEGATED_STAKE,
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should throw an error if qty does not meet minimum delegated stake amount', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
          },
        },
        qty: MIN_DELEGATED_STAKE.minus(new mIOToken(1)),
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      'Qty must be greater than the minimum delegated stake amount.',
    );
  });

  it('should throw an error if qty does not meet minimum delegated stake amount for existing staker when their current stake is vaulted', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
            delegates: {
              ['foo']: {
                delegatedStake: 0,
                start: 0,
                vaults: {
                  ['vault']: {
                    balance: MIN_DELEGATED_STAKE.valueOf(),
                    start: 0,
                    end: DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
                  },
                },
              },
            },
          },
        },
        qty: MIN_DELEGATED_STAKE.minus(new mIOToken(1)),
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      'Qty must be greater than the minimum delegated stake amount.',
    );
  });

  it('should throw an error if gateway does not exist', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
        qty: MIN_DELEGATED_STAKE,
        fromAddress: 'foo',
        gatewayAddress: 'bar',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  });

  it('should throw an error if gateway is leaving', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            status: 'leaving',
          },
        },
        qty: MIN_DELEGATED_STAKE,
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      'This Gateway is in the process of leaving the network and cannot have more stake delegated to it.',
    );
  });

  it('should throw an error if gateway does not allow delegated staking', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
            },
          },
        },
        qty: MIN_DELEGATED_STAKE,
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError('This Gateway does not allow delegated staking.');
  });

  it('should throw an error if gateway has reached maximum amount of delegated stakers', () => {
    const mockDelegates = createMockDelegates(MAX_DELEGATES + 1);
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE.valueOf() },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            delegates: mockDelegates, // how do we add 10k delegates here?
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
          },
        },
        qty: MIN_DELEGATED_STAKE,
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      `This Gateway has reached its maximum amount of delegated stakers.`,
    );
  });

  it('should delegate stake as new delegate', () => {
    const balances = { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 };
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: true,
        },
      },
    };
    const qty = MIN_DELEGATED_STAKE;
    const fromAddress = 'foo';
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: qty.valueOf(),
      start: 0,
      vaults: {},
    };
    safeDelegateStake({
      balances,
      gateways,
      qty,
      fromAddress,
      gatewayAddress,
      startHeight,
    });
    expect(gateways[gatewayAddress].delegates).toEqual({
      [fromAddress]: {
        ...expectedNewDelegateData,
      },
    });
    expect(gateways[gatewayAddress].totalDelegatedStake).toEqual(
      stubbedGatewayData.totalDelegatedStake + MIN_DELEGATED_STAKE.valueOf(),
    );
  });

  it('should add to an existing delegates stake when if their existing stake is vaulted', () => {
    const balances = { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 };
    const fromAddress = 'foo';
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedGatewayData,
        delegates: {
          [fromAddress]: {
            delegatedStake: 0,
            start: 0,
            vaults: {
              // assume their current stake is vaulted but they want to restake with a new balance
              'test-vault': {
                balance: MIN_DELEGATED_STAKE.valueOf(),
                start: 0,
                end: DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
              },
            },
          },
        },
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: true,
        },
      },
    };
    const qty = MIN_DELEGATED_STAKE;
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: qty.valueOf(),
      start: 0,
      vaults: {
        'test-vault': {
          balance: MIN_DELEGATED_STAKE.valueOf(),
          start: 0,
          end: DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
        },
      },
    };
    safeDelegateStake({
      balances,
      gateways,
      qty,
      fromAddress,
      gatewayAddress,
      startHeight,
    });
    expect(gateways[gatewayAddress].delegates).toEqual({
      [fromAddress]: {
        ...expectedNewDelegateData,
      },
    });
    expect(gateways[gatewayAddress].totalDelegatedStake).toEqual(
      stubbedGatewayData.totalDelegatedStake + MIN_DELEGATED_STAKE.valueOf(),
    );
  });

  it('should delegate stake as existing delegate', () => {
    const balances = { foo: 5, bar: 2 };
    const fromAddress = 'foo';
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: true,
        },
        delegates: {
          [fromAddress]: {
            delegatedStake: MIN_DELEGATED_STAKE.valueOf(),
            start: 0,
            vaults: {},
          },
        },
      },
    };
    const qty = new mIOToken(5);
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: MIN_DELEGATED_STAKE.plus(qty).valueOf(),
      start: 0,
      vaults: {},
    };
    safeDelegateStake({
      balances,
      gateways,
      qty,
      fromAddress,
      gatewayAddress,
      startHeight,
    });
    expect(gateways[gatewayAddress].delegates).toEqual({
      [fromAddress]: {
        ...expectedNewDelegateData,
      },
    });
    expect(gateways[gatewayAddress].totalDelegatedStake).toEqual(
      stubbedGatewayData.totalDelegatedStake + qty.valueOf(),
    );
  });
});

describe('safeDecreaseDelegateStake function', () => {
  it('should throw an error if gateway does not exist', () => {
    expect(() => {
      safeDecreaseDelegateStake({
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
        qty: new mIOToken(1),
        fromAddress: 'foo',
        gatewayAddress: 'bar',
        id: 'unlocked',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  });

  it('should throw an error if delegate does not exist in gateway', () => {
    expect(() => {
      safeDecreaseDelegateStake({
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
        qty: new mIOToken(1),
        fromAddress: 'bar',
        gatewayAddress: stubbedArweaveTxId,
        id: 'unlocked',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError('This delegate is not staked at this gateway.');
  });

  it('should throw an error if delegate withdraws below the minimum', () => {
    expect(() => {
      safeDecreaseDelegateStake({
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            delegates: {
              ['bar']: {
                delegatedStake: MIN_DELEGATED_STAKE.multiply(2).valueOf(),
                start: 0,
                vaults: {},
              },
            },
          },
        },
        qty: MIN_DELEGATED_STAKE.plus(new mIOToken(1)),
        fromAddress: 'bar',
        gatewayAddress: stubbedArweaveTxId,
        id: 'unlocked',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      `Remaining delegated stake must be greater than the minimum delegated stake amount.`,
    );
  });

  it('should throw an error if delegate withdraws too much', () => {
    expect(() => {
      safeDecreaseDelegateStake({
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            delegates: {
              ['bar']: {
                delegatedStake: MIN_DELEGATED_STAKE.valueOf(),
                start: 0,
                vaults: {},
              },
            },
          },
        },
        qty: MIN_DELEGATED_STAKE.plus(new mIOToken(1)),
        fromAddress: 'bar',
        gatewayAddress: stubbedArweaveTxId,
        id: 'unlocked',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      `Remaining delegated stake must be greater than the minimum delegated stake amount.`,
    );
  });

  it('should decrease delegate stake', () => {
    const fromAddress = 'bar';
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: true,
        },
        delegates: {
          [fromAddress]: {
            delegatedStake: MIN_DELEGATED_STAKE.multiply(2).valueOf(),
            start: 0,
            vaults: {},
          },
        },
      },
    };
    const id = 'unlocked';
    const qty = MIN_DELEGATED_STAKE;
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: MIN_DELEGATED_STAKE.valueOf(),
      start: 0,
      vaults: {
        [id]: {
          balance: qty.valueOf(),
          start: 0,
          end: DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
        },
      },
    };
    safeDecreaseDelegateStake({
      gateways,
      qty,
      fromAddress,
      gatewayAddress,
      startHeight,
      id,
    });
    expect(gateways[gatewayAddress].delegates).toEqual({
      [fromAddress]: {
        ...expectedNewDelegateData,
      },
    });
    expect(gateways[gatewayAddress].totalDelegatedStake).toEqual(
      stubbedGatewayData.totalDelegatedStake - qty.valueOf(),
    );
  });

  it('should allow complete withdrawal', () => {
    const fromAddress = 'bar';
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: true,
        },
        delegates: {
          [fromAddress]: {
            delegatedStake: MIN_DELEGATED_STAKE.multiply(2).valueOf(),
            start: 0,
            vaults: {},
          },
        },
      },
    };
    const id = 'unlocked';
    const qty = MIN_DELEGATED_STAKE.multiply(2);
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: 0,
      start: 0,
      vaults: {
        [id]: {
          balance: qty.valueOf(),
          start: 0,
          end: DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
        },
      },
    };
    safeDecreaseDelegateStake({
      gateways,
      qty,
      fromAddress,
      gatewayAddress,
      startHeight,
      id,
    });
    expect(gateways[gatewayAddress].delegates).toEqual({
      [fromAddress]: {
        ...expectedNewDelegateData,
      },
    });
    expect(gateways[gatewayAddress].totalDelegatedStake).toEqual(
      stubbedGatewayData.totalDelegatedStake - qty.valueOf(),
    );
  });
});
