import { TENURE_WEIGHT_TOTAL_BLOCK_COUNT } from '../../constants';
import { getBaselineState } from '../../tests/stubs';
import { baselineGatewayData } from '../write/saveObservations.test';
import { getGateway } from './gateways';

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
          ...baselineGatewayData,
          start: 10,
        },
      },
      // no distributions
    };
    const observer = await getGateway(state, {
      caller: 'a-test-gateway',
      input: {},
    });
    expect(observer).toEqual({
      result: {
        ...baselineGatewayData,
        start: 10,
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

  it('should return the observer and its weights when the caller is a valid gateway address', async () => {
    // the next epoch
    SmartWeave.block.height = 200;
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': baselineGatewayData,
      },
      // no distributions
    };
    const observer = await getGateway(state, {
      caller: 'a-test-gateway',
      input: {},
    });
    // incremented by 1
    const expectedTenureWeight = 200 / TENURE_WEIGHT_TOTAL_BLOCK_COUNT;
    const expectedCompositeWeight = 1 * 1 * 1 * expectedTenureWeight;
    expect(observer).toEqual({
      result: {
        ...baselineGatewayData,
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
    SmartWeave.block.height = 200;
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': baselineGatewayData,
      },
      // no distributions
    };
    const observer = await getGateway(state, {
      caller: 'a-random-caller',
      input: {
        target: 'a-test-gateway',
      },
    });
    const expectedTenureWeight = 200 / TENURE_WEIGHT_TOTAL_BLOCK_COUNT;
    const expectedCompositeWeight = 1 * 1 * 1 * expectedTenureWeight;
    expect(observer).toEqual({
      result: {
        ...baselineGatewayData,
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
