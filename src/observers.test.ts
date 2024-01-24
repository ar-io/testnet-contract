import { createHash } from 'node:crypto';

import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  GATEWAY_LEAVE_LENGTH,
  MAXIMUM_OBSERVERS_PER_EPOCH,
  TALLY_PERIOD_BLOCKS,
  TENURE_WEIGHT_TOTAL_BLOCK_COUNT,
} from './constants';
import {
  getEntropyHashForEpoch,
  getEpochBoundariesForHeight,
  getPrescribedObserversForEpoch,
  isGatewayEligibleForDistribution,
} from './observers';
import { baselineGatewayData, getBaselineState } from './tests/stubs';
import { BlockHeight, DeepReadonly, Gateway, Gateways } from './types';

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
  epochZeroStartHeight: 0,
  epochStartHeight: 0,
  epochEndHeight: DEFAULT_EPOCH_BLOCK_LENGTH - 1,
  epochDistributionHeight: DEFAULT_EPOCH_BLOCK_LENGTH - 1 + TALLY_PERIOD_BLOCKS,
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

  it(`should return the all eligible observers with proper weights if the total number is less than ${MAXIMUM_OBSERVERS_PER_EPOCH}`, async () => {
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
      epochEndHeight: new BlockHeight(epochStartHeight + 10),
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

  it(`should return the correct number observers with proper weights if there are more than ${MAXIMUM_OBSERVERS_PER_EPOCH} gateways with composite scores greater than 0`, async () => {
    const epochStartHeight = 10;
    const eligibleGateways: DeepReadonly<Gateways> = {
      ...gateways,
      'test-observer-wallet-4': {
        ...baselineGatewayData,
        operatorStake: 400,
        start: 4,
        observerWallet: 'test-observer-wallet-4',
      },
      'test-observer-wallet-5': {
        ...baselineGatewayData,
        operatorStake: 500,
        start: 5,
        observerWallet: 'test-observer-wallet-5',
      },
      'test-observer-wallet-6': {
        ...baselineGatewayData,
        operatorStake: 600,
        start: 6,
        observerWallet: 'test-observer-wallet-6',
      },
    };
    const minNetworkJoinStakeAmount = 10;
    const observers = await getPrescribedObserversForEpoch({
      gateways: eligibleGateways,
      distributions,
      minNetworkJoinStakeAmount: 10,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(epochStartHeight + 10),
    });
    expect(observers).toBeDefined();
    expect(observers.length).toBe(MAXIMUM_OBSERVERS_PER_EPOCH);
    const expectedObserverWeights = [];
    for (const gateway of Object.keys(eligibleGateways)) {
      const expectedGatewayRewardRatioWeight = 1;
      const expectedObserverRewardRatioWeight = 1;
      const expectedStakeWeight =
        eligibleGateways[gateway].operatorStake / minNetworkJoinStakeAmount;
      const expectedTenureWeight =
        (epochStartHeight - eligibleGateways[gateway].start) /
        TENURE_WEIGHT_TOTAL_BLOCK_COUNT;
      const expectedCompositeWeight =
        expectedTenureWeight * expectedStakeWeight;
      expectedObserverWeights.push({
        gatewayAddress: gateway,
        observerAddress: eligibleGateways[gateway].observerWallet,
        stake: eligibleGateways[gateway].operatorStake,
        start: eligibleGateways[gateway].start,
        stakeWeight: expectedStakeWeight,
        tenureWeight: expectedTenureWeight,
        gatewayRewardRatioWeight: expectedGatewayRewardRatioWeight,
        observerRewardRatioWeight: expectedObserverRewardRatioWeight,
        compositeWeight: expectedCompositeWeight,
        normalizedCompositeWeight: 0, // set this after gateways have been selected
      });
    }
    const totalCompositeWeight = expectedObserverWeights.reduce(
      (acc, current) => (acc += current.compositeWeight),
      0,
    );
    for (const observer of expectedObserverWeights) {
      observer.normalizedCompositeWeight =
        observer.compositeWeight / totalCompositeWeight;
    }
    // now we select the observers from the expected weights
    const expectedObservers = [
      expectedObserverWeights[0], // 'test-observer-wallet-1',
      expectedObserverWeights[2], // 'test-observer-wallet-3',
      expectedObserverWeights[3], // 'test-observer-wallet-4',
      expectedObserverWeights[5], // 'test-observer-wallet-5',
    ].sort((a, b) => a.normalizedCompositeWeight - b.normalizedCompositeWeight);
    expect(observers).toEqual(expectedObservers);
  });

  it('should still include gateways that have not passed any epochs, with adjusted composite weights', async () => {
    const epochStartHeight = 10;
    const appendedGateways: DeepReadonly<Gateways> = {
      ...gateways,
      'test-observer-wallet-4': {
        ...baselineGatewayData,
        operatorStake: 400,
        start: 4,
        observerWallet: 'test-observer-wallet-4',
      },
      'test-observer-wallet-5': {
        ...baselineGatewayData,
        operatorStake: 500,
        start: 5,
        observerWallet: 'test-observer-wallet-5',
      },
      'test-observer-wallet-6': {
        ...baselineGatewayData,
        operatorStake: 600,
        start: 6,
        observerWallet: 'test-observer-wallet-6',
      },
    };
    const distributions = {
      ...getBaselineState().distributions,
      gateways: {
        'test-observer-wallet-1': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 1,
          totalEpochParticipationCount: 1,
        },
        'test-observer-wallet-2': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 2,
          totalEpochParticipationCount: 2,
        },
        'test-observer-wallet-3': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 3,
        },
        'test-observer-wallet-4': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 4,
        },
        'test-observer-wallet-5': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 5,
        },
        'test-observer-wallet-6': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 6,
        },
      },
      observers: {
        'test-observer-wallet-1': {
          submittedEpochCount: 1,
          totalEpochsPrescribedCount: 1,
        },
        'test-observer-wallet-2': {
          submittedEpochCount: 1,
          totalEpochsPrescribedCount: 1,
        },
        'test-observer-wallet-3': {
          submittedEpochCount: 1,
          totalEpochsPrescribedCount: 1,
        },
        'test-observer-wallet-4': {
          submittedEpochCount: 1,
          totalEpochsPrescribedCount: 1,
        },
        'test-observer-wallet-5': {
          submittedEpochCount: 1,
          totalEpochsPrescribedCount: 1,
        },
        'test-observer-wallet-6': {
          submittedEpochCount: 1,
          totalEpochsPrescribedCount: 1,
        },
      },
    };
    const observers = await getPrescribedObserversForEpoch({
      gateways: appendedGateways,
      distributions,
      minNetworkJoinStakeAmount: 10,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(epochStartHeight + 10),
    });

    expect(observers.length).toEqual(MAXIMUM_OBSERVERS_PER_EPOCH);
    expect(observers.map((o) => o.gatewayAddress)).toEqual(
      expect.arrayContaining([
        'test-observer-wallet-1',
        'test-observer-wallet-2',
        'test-observer-wallet-3',
        'test-observer-wallet-4',
      ]),
    );
  });
});

describe('isGatewayEligibleForDistribution', () => {
  it.each([
    [
      'should be true if the gateway is joined, and started before the epoch start',
      {
        ...baselineGatewayData,
        status: 'joined',
        start: 0,
      },
      10,
      Number.MAX_SAFE_INTEGER,
      true,
    ],
    [
      'should be true if the gateway is joined, and started at the same block as the epoch start',
      {
        ...baselineGatewayData,
        status: 'joined',
        start: 10,
      },
      10,
      Number.MAX_SAFE_INTEGER,
      true,
    ],
    [
      'should be true if the gateway is leaving, but started before the epoch start and leaving after the end of the epoch',
      {
        ...baselineGatewayData,
        status: 'leaving',
        end: GATEWAY_LEAVE_LENGTH + 1,
        start: 0,
      },
      10,
      GATEWAY_LEAVE_LENGTH,
      true,
    ],
    [
      'should be true if the gateway is joined, and started before the epoch with large numbers',
      {
        ...baselineGatewayData,
        start: Number.MAX_SAFE_INTEGER - 1,
      },
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      true,
    ],
    [
      'should be false if gateway is undefined',
      undefined,
      10,
      Number.MAX_SAFE_INTEGER,
      false,
    ],
    [
      'should be false if gateway is joined but started after the epoch start',
      {
        ...baselineGatewayData,
        status: 'joined',
        start: 11,
      },
      10,
      Number.MAX_SAFE_INTEGER,
      false,
    ],
    [
      'should be false if gateway is leaving before the end of the epoch',
      {
        ...baselineGatewayData,
        status: 'leaving',
        start: 10,
        end: GATEWAY_LEAVE_LENGTH - 1,
      },
      10,
      GATEWAY_LEAVE_LENGTH,
      false,
    ],
    [
      'should be false if gateway is joined and started after the epoch start',
      {
        ...baselineGatewayData,
        start: Number.MAX_SAFE_INTEGER,
      },
      Number.MAX_SAFE_INTEGER - 10,
      Number.MAX_SAFE_INTEGER,
      false,
    ],
  ])(
    '%s',
    (
      _: string,
      gateway: Gateway,
      epochStartHeight: number,
      epochEndHeight: number,
      result: boolean,
    ) => {
      expect(
        isGatewayEligibleForDistribution({
          gateway,
          epochStartHeight: new BlockHeight(epochStartHeight),
          epochEndHeight: new BlockHeight(epochEndHeight),
        }),
      ).toBe(result);
    },
  );
});

describe('getEpochBoundariesForHeight', () => {
  it.each([
    [1, 1, 1, 1, 1],
    [19, 2, 100, 2, 101],
    [34, 0, Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER - 1],
    [1340134, 1339961, 50, 1340111, 1340160],
  ])(
    'should for current height of %d, zero block height of %d and epoch length of %d return the epoch start of %d and epoch end %d',
    (
      currentHeight,
      zeroHeight,
      epochLength: number,
      expectedStart,
      expectedEnd,
    ) => {
      const {
        epochStartHeight: returnedStartHeight,
        epochEndHeight: returnedEndHeight,
      } = getEpochBoundariesForHeight({
        currentBlockHeight: new BlockHeight(currentHeight),
        epochZeroStartHeight: new BlockHeight(zeroHeight),
        epochBlockLength: new BlockHeight(epochLength),
      });
      expect(returnedStartHeight.valueOf()).toBe(expectedStart);
      expect(returnedEndHeight.valueOf()).toBe(expectedEnd);
    },
  );

  it('should default the epoch block length if not provided', () => {
    const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
      currentBlockHeight: new BlockHeight(5),
      epochZeroStartHeight: new BlockHeight(0),
    });
    expect(epochStartHeight.valueOf()).toBe(0);
    expect(epochEndHeight.valueOf()).toBe(DEFAULT_EPOCH_BLOCK_LENGTH - 1);
  });
});

describe('getEntropyForEpoch', () => {
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

  it('should return the correct entropy for a given epoch', async () => {
    // we create a hash of three blocks hash data as the entropy
    const epochStartHeight = 0;
    const expectedBuffer = Buffer.concat([
      Buffer.from('test-indep-hash', 'base64url'), // hash from block 1
      Buffer.from('test-indep-hash', 'base64url'), // hash from block 2
      Buffer.from('test-indep-hash', 'base64url'), // hash from block 3
    ]);
    // we call the smartweave hashing function
    const expectedHash = await SmartWeave.arweave.crypto.hash(
      expectedBuffer,
      'SHA-256',
    );
    const entropy = await getEntropyHashForEpoch({
      epochStartHeight: new BlockHeight(epochStartHeight),
    });
    expect(entropy.toString()).toBe(expectedHash.toString());
  });

  it('should throw an error if a block does not have indep_hash', async () => {
    SmartWeave.safeArweaveGet = (): Promise<any> => {
      return Promise.resolve({}); // no indep_hash
    };
    // we create a hash of three blocks hash data as the entropy
    const error = await getEntropyHashForEpoch({
      epochStartHeight: new BlockHeight(0),
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Block 0 has no indep_hash');
  });
});
