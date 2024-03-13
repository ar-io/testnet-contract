import { createHash } from 'node:crypto';

import {
  EPOCH_BLOCK_LENGTH,
  GATEWAY_LEAVE_BLOCK_LENGTH,
  INITIAL_EPOCH_DISTRIBUTION_DATA,
  MAXIMUM_OBSERVERS_PER_EPOCH,
  MIN_OPERATOR_STAKE,
  TENURE_WEIGHT_PERIOD,
} from './constants';
import {
  getEntropyHashForEpoch,
  getEpochDataForHeight,
  getPrescribedObserversForEpoch,
  isGatewayEligibleForDistribution,
} from './observers';
import { stubbedGatewayData, stubbedGateways } from './tests/stubs';
import { BlockHeight, DeepReadonly, Gateway, Gateways } from './types';

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
    const observers = await getPrescribedObserversForEpoch({
      gateways: {
        'test-observer-wallet-1': {
          ...stubbedGatewayData,
          operatorStake: totalStake,
          start: 0,
          observerWallet: 'test-observer-wallet-1',
        },
      },
      distributions: INITIAL_EPOCH_DISTRIBUTION_DATA,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(epochStartHeight + 10),
      minOperatorStake: MIN_OPERATOR_STAKE,
    });

    expect(observers).toBeDefined();
    const expectedStakeWeight = totalStake / MIN_OPERATOR_STAKE.valueOf();
    const expectedTenureWeight = epochStartHeight / TENURE_WEIGHT_PERIOD;
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
    const extendedStubbedGateways = {
      // initially spread so we clone
      ...stubbedGateways,
    };
    for (let i = 4; i < MAXIMUM_OBSERVERS_PER_EPOCH + 5; i++) {
      extendedStubbedGateways[`test-observer-wallet-${i}`] = {
        ...stubbedGatewayData,
        operatorStake: 100,
        start: 0,
        observerWallet: `test-observer-wallet-${i}`,
      };
    }
    const eligibleGateways: DeepReadonly<Gateways> = extendedStubbedGateways;
    const observers = await getPrescribedObserversForEpoch({
      gateways: eligibleGateways,
      distributions: INITIAL_EPOCH_DISTRIBUTION_DATA,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(epochStartHeight + 10),
      minOperatorStake: MIN_OPERATOR_STAKE,
    });
    expect(observers).toBeDefined();
    expect(observers.length).toBe(MAXIMUM_OBSERVERS_PER_EPOCH);
    const expectedObserverWeights = [];
    for (const gateway of Object.keys(eligibleGateways)) {
      const expectedGatewayRewardRatioWeight = 1;
      const expectedObserverRewardRatioWeight = 1;
      const expectedStakeWeight =
        eligibleGateways[gateway].operatorStake / MIN_OPERATOR_STAKE.valueOf();
      const expectedTenureWeight =
        (epochStartHeight - eligibleGateways[gateway].start) /
        TENURE_WEIGHT_PERIOD;
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
    // the observers returned should be a subset of the full observer weights
    expect(expectedObserverWeights).toEqual(expect.arrayContaining(observers));
  });

  it('should not include any gateways that have a composite weight of 0', async () => {
    const epochStartHeight = SmartWeave.block.height;
    const extendedStubbedGateways: DeepReadonly<Gateways> = {
      ...stubbedGateways,
      'test-observer-wallet-4': {
        ...stubbedGatewayData,
        operatorStake: 400,
        start: 4,
        observerWallet: 'test-observer-wallet-4',
      },
      'test-observer-wallet-5': {
        ...stubbedGatewayData,
        operatorStake: 500,
        start: 5,
        observerWallet: 'test-observer-wallet-5',
      },
      'test-observer-wallet-6': {
        ...stubbedGatewayData,
        operatorStake: 600,
        start: 6,
        observerWallet: 'test-observer-wallet-6',
      },
    };
    const observers = await getPrescribedObserversForEpoch({
      gateways: extendedStubbedGateways,
      distributions: INITIAL_EPOCH_DISTRIBUTION_DATA,
      minOperatorStake: MIN_OPERATOR_STAKE,
      epochStartHeight: new BlockHeight(epochStartHeight),
      epochEndHeight: new BlockHeight(epochStartHeight + EPOCH_BLOCK_LENGTH),
    });
    // only include the gateways that do not have a zero composite weight based on their composite weight
    expect(observers.map((o) => o.gatewayAddress)).toEqual(
      expect.arrayContaining(['a-gateway', 'a-gateway-2', 'a-gateway-3']),
    );
  });
});

describe('isGatewayEligibleForDistribution', () => {
  it.each([
    [
      'should be true if the gateway is joined, and started before the epoch start',
      {
        ...stubbedGatewayData,
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
        ...stubbedGatewayData,
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
        ...stubbedGatewayData,
        status: 'leaving',
        end: GATEWAY_LEAVE_BLOCK_LENGTH.plus(new BlockHeight(1)),
        start: 0,
      },
      10,
      GATEWAY_LEAVE_BLOCK_LENGTH.valueOf(),
      true,
    ],
    [
      'should be true if the gateway is joined, and started before the epoch with large numbers',
      {
        ...stubbedGatewayData,
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
        ...stubbedGatewayData,
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
        ...stubbedGatewayData,
        status: 'leaving',
        start: 10,
        end: GATEWAY_LEAVE_BLOCK_LENGTH.minus(new BlockHeight(1)),
      },
      10,
      GATEWAY_LEAVE_BLOCK_LENGTH.valueOf(),
      false,
    ],
    [
      'should be false if gateway is joined and started after the epoch start',
      {
        ...stubbedGatewayData,
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

describe('getEpochDataForHeight', () => {
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
      } = getEpochDataForHeight({
        currentBlockHeight: new BlockHeight(currentHeight),
        epochZeroStartHeight: new BlockHeight(zeroHeight),
        epochBlockLength: new BlockHeight(epochLength),
      });
      expect(returnedStartHeight.valueOf()).toBe(expectedStart);
      expect(returnedEndHeight.valueOf()).toBe(expectedEnd);
    },
  );

  it('should default the epoch block length if not provided', () => {
    const { epochStartHeight, epochEndHeight } = getEpochDataForHeight({
      currentBlockHeight: new BlockHeight(5),
      epochZeroStartHeight: new BlockHeight(0),
    });
    expect(epochStartHeight.valueOf()).toBe(0);
    expect(epochEndHeight.valueOf()).toBe(EPOCH_BLOCK_LENGTH - 1);
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
