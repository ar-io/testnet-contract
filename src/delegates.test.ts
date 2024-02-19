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
import { BlockHeight, DelegateData, IOToken } from './types';

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
          qty: new IOToken(MIN_DELEGATED_STAKE),
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
        qty: new IOToken(MIN_DELEGATED_STAKE),
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should throw an error if qty does not meet minimum delegated stake amount', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE, bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE - 1),
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
        balances: { foo: MIN_DELEGATED_STAKE, bar: 2 },
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
                    balance: MIN_DELEGATED_STAKE,
                    start: 0,
                    end: DELEGATED_STAKE_UNLOCK_LENGTH,
                  },
                },
              },
            },
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE - 1),
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
        balances: { foo: MIN_DELEGATED_STAKE, bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE),
        fromAddress: 'foo',
        gatewayAddress: 'bar',
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  });

  it('should throw an error if gateway is leaving', () => {
    expect(() => {
      safeDelegateStake({
        balances: { foo: MIN_DELEGATED_STAKE, bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            status: 'leaving',
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE),
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
        balances: { foo: MIN_DELEGATED_STAKE, bar: 2 },
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
            },
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE),
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
        balances: { foo: MIN_DELEGATED_STAKE },
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
        qty: new IOToken(MIN_DELEGATED_STAKE),
        fromAddress: 'foo',
        gatewayAddress: stubbedArweaveTxId,
        startHeight: new BlockHeight(0),
      });
    }).toThrowError(
      `This Gateway has reached its maximum amount of delegated stakers.`,
    );
  });

  it('should delegate stake as new delegate', () => {
    const balances = { foo: MIN_DELEGATED_STAKE, bar: 2 };
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: true,
        },
      },
    };
    const qty = new IOToken(MIN_DELEGATED_STAKE);
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
      stubbedGatewayData.totalDelegatedStake + MIN_DELEGATED_STAKE,
    );
  });

  it('should add to an existing delegates stake when if their existing stake is vaulted', () => {
    const balances = { foo: MIN_DELEGATED_STAKE, bar: 2 };
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
                balance: MIN_DELEGATED_STAKE,
                start: 0,
                end: DELEGATED_STAKE_UNLOCK_LENGTH,
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
    const qty = new IOToken(MIN_DELEGATED_STAKE);
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: qty.valueOf(),
      start: 0,
      vaults: {
        'test-vault': {
          balance: MIN_DELEGATED_STAKE,
          start: 0,
          end: DELEGATED_STAKE_UNLOCK_LENGTH,
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
      stubbedGatewayData.totalDelegatedStake + MIN_DELEGATED_STAKE,
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
            delegatedStake: MIN_DELEGATED_STAKE,
            start: 0,
            vaults: {},
          },
        },
      },
    };
    const qty = new IOToken(5);
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: MIN_DELEGATED_STAKE + qty.valueOf(),
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
        qty: new IOToken(1),
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
        qty: new IOToken(1),
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
                delegatedStake: MIN_DELEGATED_STAKE * 2,
                start: 0,
                vaults: {},
              },
            },
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE + 1),
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
                delegatedStake: MIN_DELEGATED_STAKE,
                start: 0,
                vaults: {},
              },
            },
          },
        },
        qty: new IOToken(MIN_DELEGATED_STAKE + 1),
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
            delegatedStake: MIN_DELEGATED_STAKE * 2,
            start: 0,
            vaults: {},
          },
        },
      },
    };
    const id = 'unlocked';
    const qty = new IOToken(MIN_DELEGATED_STAKE);
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: MIN_DELEGATED_STAKE,
      start: 0,
      vaults: {
        [id]: {
          balance: qty.valueOf(),
          start: 0,
          end: DELEGATED_STAKE_UNLOCK_LENGTH,
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
            delegatedStake: MIN_DELEGATED_STAKE * 2,
            start: 0,
            vaults: {},
          },
        },
      },
    };
    const id = 'unlocked';
    const qty = new IOToken(MIN_DELEGATED_STAKE * 2);
    const gatewayAddress = stubbedArweaveTxId;
    const startHeight = new BlockHeight(0);
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: 0,
      start: 0,
      vaults: {
        [id]: {
          balance: qty.valueOf(),
          start: 0,
          end: DELEGATED_STAKE_UNLOCK_LENGTH,
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