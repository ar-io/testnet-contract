import {
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVER_WALLET,
  MAX_PORT_NUMBER,
  MIN_DELEGATED_STAKE,
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

describe('joinNetwork', () => {
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
      'should throw an error for invalid port (cant be a string)',
      {
        ...validInput,
        port: 'bad-port',
      },
    ],
    [
      'should throw an error for invalid port (cant be too high)',
      {
        ...validInput,
        port: MAX_PORT_NUMBER + 1,
      },
    ],
    [
      'should throw an error for invalid allowDelegatedStaking (must be boolean)',
      {
        ...validInput,
        allowDelegatedStaking: 0,
      },
    ],
    [
      'should throw an error for invalid allowDelegatedStaking (must be boolean)',
      {
        ...validInput,
        allowDelegatedStaking: 'boolean-only',
      },
    ],
    [
      'should throw an error for invalid delegateRewardRatio (must be an integer)',
      {
        ...validInput,
        delegateRewardRatio: 10.5,
      },
    ],
    [
      'should throw an error for invalid delegateRewardRatio (too high)',
      {
        ...validInput,
        delegateRewardRatio: 101,
      },
    ],
    [
      'should throw an error for invalid delegateRewardRatio (cant be a string)',
      {
        ...validInput,
        delegateRewardRatio: 'integer-between-1-and-100',
      },
    ],
    [
      'should throw an error for invalid reservedDelegates (no array)',
      {
        ...validInput,
        reservedDelegates: stubbedArweaveTxId, // must be in an array
      },
    ],
    [
      'should throw an error for invalid reservedDelegates (invalid array)',
      {
        ...validInput,
        reservedDelegates: [1, 2, 3], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid reservedDelegates (non-unique wallets',
      {
        ...validInput,
        reservedDelegates: [stubbedArweaveTxId, stubbedArweaveTxId], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid reservedDelegates (invalid wallet in array)',
      {
        ...validInput,
        reservedDelegates: ['&GWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ'], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid reservedDelegates (invalid multi-element array)',
      {
        ...validInput,
        reservedDelegates: [stubbedArweaveTxId, 'woops'], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid minDelegatedStake (below minimum delegated stake)',
      {
        ...validInput,
        minDelegatedStake: MIN_DELEGATED_STAKE - 1, // should not be below minimum
      },
    ],
    [
      'should throw an error for invalid minDelegatedStake (non-integer)',
      {
        ...validInput,
        minDelegatedStake: MIN_DELEGATED_STAKE + 0.1, // integers only
      },
    ],
    [
      'should throw an error for invalid minDelegatedStake (cant be a string)',
      {
        ...validInput,
        minDelegatedStake: 'numbers-only', // numbers only
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

  it('should add the gateway to the registry and join the network with no delegated staking', async () => {
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
      delegatedStake: 0,
      settings: {
        port: 1234,
        protocol: 'https',
        label: 'test',
        fqdn: 'test.com',
        note: 'test-note',
        properties: stubbedArweaveTxId,
        allowDelegatedStaking: false,
        reservedDelegates: [],
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardRatio: 0,
      },
      start: SmartWeave.block.height,
      observerWallet: stubbedArweaveTxId,
      vaults: {},
      delegates: {},
      status: 'joined',
      end: 0,
    });
    expect(state.balances[stubbedArweaveTxId]).toEqual(undefined);
  });

  it('should add the gateway to the registry and join the network with enabling delegated staking', async () => {
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
        allowDelegatedStaking: true,
        delegateRewardRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
      },
    });
    expect(state.gateways[stubbedArweaveTxId]).toEqual({
      operatorStake: 10,
      delegatedStake: 0,
      settings: {
        port: 1234,
        protocol: 'https',
        label: 'test',
        fqdn: 'test.com',
        note: 'test-note',
        properties: stubbedArweaveTxId,
        allowDelegatedStaking: true,
        reservedDelegates: [],
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
      },
      start: SmartWeave.block.height,
      observerWallet: stubbedArweaveTxId,
      vaults: {},
      delegates: {},
      status: 'joined',
      end: 0,
    });
    expect(state.balances[stubbedArweaveTxId]).toEqual(undefined);
  });

  it('should add the gateway to the registry and join the network without enabling delegated staking but adding reserved delegates', async () => {
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
        delegateRewardRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
        reservedDelegates: [stubbedArweaveTxId],
      },
    });
    expect(state.gateways[stubbedArweaveTxId]).toEqual({
      operatorStake: 10,
      delegatedStake: 0,
      settings: {
        port: 1234,
        protocol: 'https',
        label: 'test',
        fqdn: 'test.com',
        note: 'test-note',
        properties: stubbedArweaveTxId,
        allowDelegatedStaking: false,
        reservedDelegates: [stubbedArweaveTxId],
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
      },
      start: SmartWeave.block.height,
      observerWallet: stubbedArweaveTxId,
      vaults: {},
      delegates: {},
      status: 'joined',
      end: 0,
    });
    expect(state.balances[stubbedArweaveTxId]).toEqual(undefined);
  });
});
