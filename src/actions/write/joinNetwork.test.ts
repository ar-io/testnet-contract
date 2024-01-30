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
import { stubbedGatewayData } from '../../tests/stubs';
import { IOState } from '../../types';
import { joinNetwork } from './joinNetwork';

const validInput = {
  observerWallet: stubbedArweaveTxId,
  port: 1234,
  protocol: 'https',
  label: 'test',
  fqdn: 'test.com',
  note: 'test-note',
  properties: stubbedArweaveTxId,
  qty: 10000,
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
      'should throw an error for invalid delegateRewardShareRatio (must be an integer)',
      {
        ...validInput,
        delegateRewardShareRatio: 10.5,
      },
    ],
    [
      'should throw an error for invalid delegateRewardShareRatio (too high)',
      {
        ...validInput,
        delegateRewardShareRatio: 101,
      },
    ],
    [
      'should throw an error for invalid delegateRewardShareRatio (cant be a string)',
      {
        ...validInput,
        delegateRewardShareRatio: 'integer-between-1-and-100',
      },
    ],
    [
      'should throw an error for invalid allowedDelegates (no array)',
      {
        ...validInput,
        allowedDelegates: stubbedArweaveTxId, // must be in an array
      },
    ],
    [
      'should throw an error for invalid allowedDelegates (invalid array)',
      {
        ...validInput,
        allowedDelegates: [1, 2, 3], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid allowedDelegates (non-unique wallets',
      {
        ...validInput,
        allowedDelegates: [stubbedArweaveTxId, stubbedArweaveTxId], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid allowedDelegates (invalid wallet in array)',
      {
        ...validInput,
        allowedDelegates: ['&GWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ'], // must be in an array of valid arweave wallets
      },
    ],
    [
      'should throw an error for invalid allowedDelegates (invalid multi-element array)',
      {
        ...validInput,
        allowedDelegates: [stubbedArweaveTxId, 'woops'], // must be in an array of valid arweave wallets
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

  it('should throw an error if the stake amount is less than minimum join amount', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        'a-gateway-with-balance': 100000,
      },
    };
    const error = await joinNetwork(initialState, {
      caller: 'a-gateway-with-balance',
      input: {
        ...validInput,
        qty: 1,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE);
  });

  it('should throw an error if the gateway already exists', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        'existing-gateway': 10000,
      },
      gateways: {
        'existing-gateway': {
          ...stubbedGatewayData,
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
        'existing-gateway': 10000,
        'a-new-gateway': 10000,
      },
      gateways: {
        'existing-gateway': {
          ...stubbedGatewayData,
          observerWallet: stubbedArweaveTxId,
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
        allowedDelegates: [],
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardShareRatio: 0,
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
    };
    const { state } = await joinNetwork(initialState, {
      caller: stubbedArweaveTxId,
      input: {
        ...validInput,
        allowDelegatedStaking: true,
        delegateRewardShareRatio: Math.floor(
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
        allowedDelegates: [],
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardShareRatio: Math.floor(
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
    };
    const { state } = await joinNetwork(initialState, {
      caller: stubbedArweaveTxId,
      input: {
        ...validInput,
        delegateRewardShareRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
        allowedDelegates: [stubbedArweaveTxId],
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
        allowedDelegates: [stubbedArweaveTxId],
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardShareRatio: Math.floor(
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
