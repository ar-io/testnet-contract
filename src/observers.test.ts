import { createHash } from 'node:crypto';

import { TENURE_WEIGHT_TOTAL_BLOCK_COUNT } from './constants';
import { getPrescribedObserversForEpoch } from './observers';
import { baselineGatewayData } from './tests/stubs';
import { BlockHeight } from './types';

const gateways = {
  'test-observer-wallet-1': {
    ...baselineGatewayData,
    operatorStake: 100,
    observerWallet: 'test-observer-wallet-1',
  },
  'test-observer-wallet-2': {
    ...baselineGatewayData,
    operatorStake: 200,
    observerWallet: 'test-observer-wallet-2',
  },
  'test-observer-wallet-3': {
    ...baselineGatewayData,
    operatorStake: 300,
    observerWallet: 'test-observer-wallet-3',
  },
};

const distributions = {
  epochZeroBlockHeight: 0,
  lastCompletedEpochStartHeight: 0,
  lastCompletedEpochEndHeight: 0,
  gateways: {},
  observers: {},
};

describe('getPrescribedObserversForEpoch', () => {
  beforeAll(() => {
    // stub arweave crypto hash function
    SmartWeave.arweave.crypto.hash = (
      buffer: Buffer,
      algorithm: string,
    ): Promise<Buffer> => {
      const hash = createHash(algorithm);
      hash.update(buffer);
      return Promise.resolve(hash.digest());
    };

    // TODO: hard these values in the test based on the response from arweave.net for our test block heights
    SmartWeave.safeArweaveGet = (): Promise<any> => {
      return Promise.resolve({
        indep_hash: 'test-indep-hash',
      });
    };
  });

  afterAll(() => {
    // reset stubs
    jest.resetAllMocks();
  });

  it('should return the correct all observers with proper weights if less than the number required', async () => {
    const epochStartHeight = 10;
    const totalStake = 100;
    const minNetworkJoinStakeAmount = 10;
    const observers = await getPrescribedObserversForEpoch({
      gateways: {
        'test-observer-wallet-1': {
          ...baselineGatewayData,
          operatorStake: totalStake,
          start: 0,
          observerWallet: 'test-observer-wallet-1',
        },
      },
      distributions,
      minNetworkJoinStakeAmount: 10,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(20),
    });

    expect(observers).toBeDefined();
    const expectedStakeWeight = totalStake / minNetworkJoinStakeAmount;
    const expectedTenureWeight =
      epochStartHeight / TENURE_WEIGHT_TOTAL_BLOCK_COUNT;
    const expectedCompositeWeight = expectedTenureWeight * expectedStakeWeight;
    expect(observers).toEqual([
      {
        gatewayAddress: 'test-observer-wallet-1',
        observerAddress: 'test-observer-wallet-1',
        stake: totalStake,
        start: 0,
        stakeWeight: expectedStakeWeight,
        tenureWeight: expectedTenureWeight,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: expectedCompositeWeight,
        normalizedCompositeWeight: 1, // no other gateways
      },
    ]);
  });

  it('should return the correct all observers with proper weights if less than the number required', async () => {
    const epochStartHeight = 10;
    const observers = await getPrescribedObserversForEpoch({
      gateways: {
        ...gateways,
        // only 4 should get selected
        'test-observer-wallet-4': {
          ...baselineGatewayData,
          operatorStake: 400,
          start: 5,
          observerWallet: 'test-observer-wallet-4',
        },
        'test-observer-wallet-5': {
          ...baselineGatewayData,
          operatorStake: 500,
          start: 10, // it won't be included as an eligible gateway
          observerWallet: 'test-observer-wallet-5',
        },
      },
      distributions,
      minNetworkJoinStakeAmount: 10,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(20),
    });
    expect(observers).toBeDefined();
    expect(observers).toEqual([
      {
        gatewayAddress: 'test-observer-wallet-1',
        observerAddress: 'test-observer-wallet-1',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: epochStartHeight / TENURE_WEIGHT_TOTAL_BLOCK_COUNT, // epochEnd - gateway start
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 0.0007716049382716049,
        normalizedCompositeWeight: 0.125,
      },
      {
        gatewayAddress: 'test-observer-wallet-2',
        observerAddress: 'test-observer-wallet-2',
        stake: 200,
        start: 0,
        stakeWeight: 20,
        tenureWeight: epochStartHeight / TENURE_WEIGHT_TOTAL_BLOCK_COUNT, // epochEnd - gateway start
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 0.0015432098765432098,
        normalizedCompositeWeight: 0.25,
      },
      {
        gatewayAddress: 'test-observer-wallet-3',
        observerAddress: 'test-observer-wallet-3',
        stake: 300,
        start: 0,
        stakeWeight: 30,
        tenureWeight: epochStartHeight / TENURE_WEIGHT_TOTAL_BLOCK_COUNT, // epochEnd - gateway start
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 0.0023148148148148147,
        normalizedCompositeWeight: 0.375,
      },
      {
        gatewayAddress: 'test-observer-wallet-4',
        observerAddress: 'test-observer-wallet-4',
        stake: 400,
        start: 5,
        stakeWeight: 40,
        tenureWeight: (epochStartHeight - 5) / TENURE_WEIGHT_TOTAL_BLOCK_COUNT, // epochEnd - gateway start
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 0.0015432098765432098,
        normalizedCompositeWeight: 0.25,
      },
    ]);
  });
});
