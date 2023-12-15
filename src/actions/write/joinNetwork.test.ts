import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVER_WALLET,
} from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { IOState } from '../../types';
import { joinNetwork } from './joinNetwork';
import { baselineGatewayData } from './saveObservations.test';

const validInput = {
  observerWallet: stubbedArweaveTxId,
  port: 1234,
  protocol: 'https',
  label: 'test',
  fqdn: 'test.com',
  note: 'test-note',
  properties: stubbedArweaveTxId,
  qty: 10,
};

describe.only('joinNetwork', () => {
  it.each([
    ['should throw an error an empty object', {}],
    [
      'should throw an error for invalid observerWallet',
      {
        ...validInput,
        observerWallet: 'bad-observer-wallet',
      },
    ],
    [
      'should throw an error for invalid observerWallet',
      {
        ...validInput,
        port: 'bad-port',
      },
    ],
  ])('%s', async (_: string, badInput: any) => {
    const initialState: IOState = {
      ...getBaselineState(),
    };
    const error = await joinNetwork(initialState, {
      caller: 'test',
      input: badInput,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      expect.stringContaining(INVALID_INPUT_MESSAGE),
    );
  });

  it('should throw an error if the caller does not have sufficient balance', async () => {
    const initialState = {
      ...getBaselineState(),
    };
    const error = await joinNetwork(initialState, {
      caller: 'a-gateway-without-balance',
      input: {
        ...validInput,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should throw an error if the stake amount is less then minimum join amount', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        'a-gateway-with-balance': 100,
      },
      settings: {
        ...getBaselineState().settings,
        registry: {
          ...getBaselineState().settings.registry,
          minNetworkJoinStakeAmount: 100,
        },
      },
    };
    const error = await joinNetwork(initialState, {
      caller: 'a-gateway-with-balance',
      input: {
        ...validInput,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE);
  });

  it('should throw an error if the gateway already exists', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        'existing-gateway': 10,
      },
      gateways: {
        'existing-gateway': {
          ...baselineGatewayData,
        },
      },
      settings: {
        ...getBaselineState().settings,
        registry: {
          ...getBaselineState().settings.registry,
          minNetworkJoinStakeAmount: 10,
        },
      },
    };
    const error = await joinNetwork(initialState, {
      caller: 'existing-gateway',
      input: {
        ...validInput,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(INVALID_GATEWAY_EXISTS_MESSAGE);
  });

  it('should throw an error if the gateway does not exist but the observer wallet is used by another gateway', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        'existing-gateway': 10,
        'a-new-gateway': 10,
      },
      gateways: {
        'existing-gateway': {
          ...baselineGatewayData,
          observerWallet: stubbedArweaveTxId,
        },
      },
      settings: {
        ...getBaselineState().settings,
        registry: {
          ...getBaselineState().settings.registry,
          minNetworkJoinStakeAmount: 10,
        },
      },
    };
    const error = await joinNetwork(initialState, {
      caller: 'a-new-gateway',
      input: {
        ...validInput,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(INVALID_OBSERVER_WALLET);
  });

  it('should add the gateway to the registry and join the network', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        [stubbedArweaveTxId]: 10,
      },
      settings: {
        ...getBaselineState().settings,
        registry: {
          ...getBaselineState().settings.registry,
          minNetworkJoinStakeAmount: 10,
        },
      },
    };
    const { state } = await joinNetwork(initialState, {
      caller: stubbedArweaveTxId,
      input: {
        ...validInput,
      },
    });
    expect(state.gateways[stubbedArweaveTxId]).toEqual({
      operatorStake: 10,
      settings: {
        port: 1234,
        protocol: 'https',
        label: 'test',
        fqdn: 'test.com',
        note: 'test-note',
        properties: stubbedArweaveTxId,
      },
      start: SmartWeave.block.height,
      observerWallet: stubbedArweaveTxId,
      vaults: {},
      status: 'joined',
      end: 0,
    });
    expect(state.balances[stubbedArweaveTxId]).toEqual(undefined);
  });
});
