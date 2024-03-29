import { EPOCH_BLOCK_LENGTH, TENURE_WEIGHT_PERIOD } from '../../constants';
import { getBaselineState, stubbedGatewayData } from '../../tests/stubs';
import { getGateway, getGateways } from './gateways';

describe('getGateway', () => {
  afterEach(() => {
    SmartWeave.block.height = 1;
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should throw an error when the gateway does not exist', async () => {
    const state = {
      ...getBaselineState(),
      gateways: {},
    };
    const error = await getGateway(state, {
      caller: 'test',
      input: {},
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ContractError);
    expect(error.message).toEqual('No gateway found with wallet address test.');
  });

  it('should return the gateway with weights when the caller is a valid gateway address but does not start until after the current epoch', async () => {
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': {
          ...stubbedGatewayData,
          start: 10,
        },
      },
      // no distributions
    };
    const gateway = await getGateway(state, {
      caller: 'a-test-gateway',
      input: {},
    });
    expect(gateway).toEqual({
      result: {
        ...stubbedGatewayData,
        start: 10,
        stats: {
          passedEpochCount: 0,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 0,
          submittedEpochCount: 0,
          totalEpochsPrescribedCount: 0,
        },
        weights: {
          stakeWeight: 1,
          tenureWeight: 0,
          gatewayRewardRatioWeight: 1,
          observerRewardRatioWeight: 1,
          compositeWeight: 0,
          normalizedCompositeWeight: 0,
        },
      },
    });
  });

  it('should return the gateway and its weights when the caller is a valid gateway address', async () => {
    // the next epoch
    SmartWeave.block.height = EPOCH_BLOCK_LENGTH;
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': stubbedGatewayData,
      },
      // no distributions
    };
    const gateway = await getGateway(state, {
      caller: 'a-test-gateway',
      input: {},
    });
    const expectedTenureWeight = EPOCH_BLOCK_LENGTH / TENURE_WEIGHT_PERIOD;
    const expectedCompositeWeight = 1 * 1 * 1 * expectedTenureWeight;
    expect(gateway).toEqual({
      result: {
        ...stubbedGatewayData,
        stats: {
          passedEpochCount: 0,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 0,
          submittedEpochCount: 0,
          totalEpochsPrescribedCount: 0,
        },
        weights: {
          stakeWeight: 1,
          tenureWeight: expectedTenureWeight,
          gatewayRewardRatioWeight: 1,
          observerRewardRatioWeight: 1,
          compositeWeight: expectedCompositeWeight,
          normalizedCompositeWeight: 1,
        },
      },
    });
  });

  it('should return the observer and its weights when the provided target is a valid observer address', async () => {
    // the next epoch
    SmartWeave.block.height = EPOCH_BLOCK_LENGTH;
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': stubbedGatewayData,
      },
      // no distributions
    };
    const gateway = await getGateway(state, {
      caller: 'a-random-caller',
      input: {
        target: 'a-test-gateway',
      },
    });
    const expectedTenureWeight = EPOCH_BLOCK_LENGTH / TENURE_WEIGHT_PERIOD;
    const expectedCompositeWeight = 1 * 1 * 1 * expectedTenureWeight;
    expect(gateway).toEqual({
      result: {
        ...stubbedGatewayData,
        stats: {
          passedEpochCount: 0,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 0,
          submittedEpochCount: 0,
          totalEpochsPrescribedCount: 0,
        },
        weights: {
          stakeWeight: 1,
          tenureWeight: expectedTenureWeight,
          gatewayRewardRatioWeight: 1,
          observerRewardRatioWeight: 1,
          compositeWeight: expectedCompositeWeight,
          normalizedCompositeWeight: 1,
        },
      },
    });
  });
});

describe('getGateways', () => {
  it('should return all the gateways and their weights', async () => {
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': {
          ...stubbedGatewayData,
          observerWallet: 'a-test-gateway',
        },
        'a-test-gateway-2': {
          ...stubbedGatewayData,
          observerWallet: 'a-test-gateway-2',
          start: 10,
        },
      },
      // no distributions
    };
    const { result: gateways } = await getGateways(state);
    expect(gateways).toEqual(
      expect.objectContaining({
        'a-test-gateway': {
          ...stubbedGatewayData,
          observerWallet: 'a-test-gateway',
          stats: {
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 0,
            submittedEpochCount: 0,
            totalEpochsPrescribedCount: 0,
          },
          weights: {
            stakeWeight: 1,
            tenureWeight: 1 / TENURE_WEIGHT_PERIOD, // started at the same block height
            gatewayRewardRatioWeight: 1,
            observerRewardRatioWeight: 1,
            compositeWeight: 1 / TENURE_WEIGHT_PERIOD,
            normalizedCompositeWeight: 1,
          },
        },
        'a-test-gateway-2': {
          ...stubbedGatewayData,
          observerWallet: 'a-test-gateway-2',
          start: 10,
          stats: {
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 0,
            submittedEpochCount: 0,
            totalEpochsPrescribedCount: 0,
          },
          weights: {
            stakeWeight: 1,
            tenureWeight: 0,
            gatewayRewardRatioWeight: 1,
            observerRewardRatioWeight: 1,
            compositeWeight: 0,
            normalizedCompositeWeight: 0,
          },
        },
      }),
    );
  });
});
