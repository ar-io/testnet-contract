import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  MIN_DELEGATED_STAKE,
} from './constants';
import {
  safeDelegateDistribution,
  safeGatewayStakeDistribution,
} from './distributions';
import {
  stubbedArweaveTxId,
  stubbedDelegateData,
  stubbedDelegatedGatewayData,
  stubbedGateways,
} from './tests/stubs';
import { DelegateData, mIOToken } from './types';

describe('safeDelegateDistribution function', () => {
  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve address %s",
    (balances, protocolAddress) => {
      expect(() => {
        safeDelegateDistribution({
          balances,
          gateways: {
            ...stubbedGateways,
            ['a-gateway']: {
              ...stubbedDelegatedGatewayData,
            },
          },
          qty: new mIOToken(1),
          protocolAddress,
          gatewayAddress: 'a-gateway',
          delegateAddress: 'delegate-1',
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      safeDelegateDistribution({
        balances: { foo: 1, bar: 2 },
        gateways: {
          ...stubbedGateways,
          ['a-gateway']: {
            ...stubbedDelegatedGatewayData,
          },
        },
        qty: new mIOToken(2),
        protocolAddress: 'foo',
        gatewayAddress: 'a-gateway',
        delegateAddress: 'delegate-1',
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should throw an error if gateway does not exist', () => {
    expect(() => {
      safeDelegateDistribution({
        balances: { foo: 1, bar: 2 },
        gateways: {
          ...stubbedGateways,
          ['a-gateway']: {
            ...stubbedDelegatedGatewayData,
          },
        },
        qty: new mIOToken(1),
        protocolAddress: 'foo',
        gatewayAddress: 'doesnt-exist',
        delegateAddress: 'delegate-1',
      });
    }).toThrowError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  });

  it('should throw an error if delegate does not exist in gateway', () => {
    expect(() => {
      safeDelegateDistribution({
        balances: { foo: 1, bar: 2 },
        gateways: {
          ...stubbedGateways,
          ['a-gateway']: {
            ...stubbedDelegatedGatewayData,
          },
        },
        qty: new mIOToken(1),
        protocolAddress: 'foo',
        gatewayAddress: 'a-gateway',
        delegateAddress: 'doesnt-exist',
      });
    }).toThrowError('Delegate not staked on this gateway.');
  });

  it('should distribute stake to delegate', () => {
    const balances = { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 };
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedDelegatedGatewayData,
      },
    };
    const qty = new mIOToken(1);
    const protocolAddress = 'foo';
    const gatewayAddress = stubbedArweaveTxId;
    const delegateAddress = 'delegate-1';
    const expectedNewDelegateData: DelegateData = {
      delegatedStake: stubbedDelegateData.delegatedStake + qty.valueOf(),
      start: 0,
      vaults: {},
    };
    safeDelegateDistribution({
      balances,
      gateways,
      qty,
      protocolAddress,
      gatewayAddress,
      delegateAddress,
    });
    expect(gateways[gatewayAddress].delegates[delegateAddress]).toEqual({
      ...expectedNewDelegateData,
    });
    expect(gateways[gatewayAddress].totalDelegatedStake).toEqual(
      stubbedDelegatedGatewayData.totalDelegatedStake + qty.valueOf(),
    );
  });
});

describe('safeGatewayStakeDistribution function', () => {
  it.each([
    [{ foo: 1, bar: 2 }, 'baz'],
    [{ foo: Number.NaN, bar: 2 }, 'foo'],
    [{ foo: Math.sqrt(-1), bar: 2 }, 'foo'],
  ])(
    "should throw an error if balances %p can't be used to retrieve address %s",
    (balances, protocolAddress) => {
      expect(() => {
        safeGatewayStakeDistribution({
          balances,
          gateways: {
            ...stubbedGateways,
            ['a-gateway']: {
              ...stubbedDelegatedGatewayData,
            },
          },
          qty: new mIOToken(1),
          protocolAddress,
          gatewayAddress: 'a-gateway',
        });
      }).toThrowError('Caller balance is not defined!');
    },
  );

  it('should throw an error if address does not have enough balance', () => {
    expect(() => {
      safeGatewayStakeDistribution({
        balances: { foo: 1, bar: 2 },
        gateways: {
          ...stubbedGateways,
          ['a-gateway']: {
            ...stubbedDelegatedGatewayData,
          },
        },
        qty: new mIOToken(2),
        protocolAddress: 'foo',
        gatewayAddress: 'a-gateway',
      });
    }).toThrowError(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should throw an error if gateway does not exist', () => {
    expect(() => {
      safeGatewayStakeDistribution({
        balances: { foo: 1, bar: 2 },
        gateways: {
          ...stubbedGateways,
          ['a-gateway']: {
            ...stubbedDelegatedGatewayData,
          },
        },
        qty: new mIOToken(1),
        protocolAddress: 'foo',
        gatewayAddress: 'doesnt-exist',
      });
    }).toThrowError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  });

  it('should distribute stake to gateway', () => {
    const balances = { foo: MIN_DELEGATED_STAKE.valueOf(), bar: 2 };
    const gateways = {
      [stubbedArweaveTxId]: {
        ...stubbedDelegatedGatewayData,
      },
    };
    const qty = new mIOToken(1);
    const protocolAddress = 'foo';
    const gatewayAddress = stubbedArweaveTxId;
    const expectedNewQty =
      qty.valueOf() + stubbedDelegatedGatewayData.operatorStake;
    safeGatewayStakeDistribution({
      balances,
      gateways,
      qty,
      protocolAddress,
      gatewayAddress,
    });
    expect(gateways[gatewayAddress].operatorStake).toEqual(expectedNewQty);
  });
});
