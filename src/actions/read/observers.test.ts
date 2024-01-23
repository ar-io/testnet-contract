import { TENURE_WEIGHT_TOTAL_BLOCK_COUNT } from '../../constants';
import { getPrescribedObserversForEpoch } from '../../observers';
import { getBaselineState } from '../../tests/stubs';
import { baselineGatewayData } from '../write/saveObservations.test';
import { getObserver, getPrescribedObservers } from './observers';

jest.mock('../../observers', () => ({
  ...jest.requireActual('../../observers'),
  getPrescribedObserversForEpoch: jest.fn().mockResolvedValue([]),
}));

describe('getObserver', () => {
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
    const error = await getObserver(state, { caller: 'test', input: {} }).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(ContractError);
    expect(error.message).toEqual(
      'No gateway or observer found with wallet address test.',
    );
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
    const observer = await getObserver(state, {
      caller: 'a-test-gateway',
      input: {},
    });
    const expectedTenureWeight = 200 / TENURE_WEIGHT_TOTAL_BLOCK_COUNT;
    const expectedCompositeWeight = 1 * 1 * 1 * expectedTenureWeight;
    expect(observer).toEqual({
      result: {
        start: baselineGatewayData.start,
        stake: baselineGatewayData.operatorStake,
        gatewayAddress: 'a-test-gateway',
        observerAddress: baselineGatewayData.observerWallet,
        stakeWeight: 1,
        tenureWeight: expectedTenureWeight,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: expectedCompositeWeight,
        normalizedCompositeWeight: 1,
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
    const observer = await getObserver(state, {
      caller: 'a-random-caller',
      input: {
        target: baselineGatewayData.observerWallet,
      },
    });
    const expectedTenureWeight = 200 / TENURE_WEIGHT_TOTAL_BLOCK_COUNT;
    const expectedCompositeWeight = 1 * 1 * 1 * expectedTenureWeight;
    expect(observer).toEqual({
      result: {
        start: baselineGatewayData.start,
        stake: baselineGatewayData.operatorStake,
        gatewayAddress: 'a-test-gateway',
        observerAddress: baselineGatewayData.observerWallet,
        stakeWeight: 1,
        tenureWeight: expectedTenureWeight,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: expectedCompositeWeight,
        normalizedCompositeWeight: 1,
      },
    });
  });
});

describe('getPrescribedObservers', () => {
  it('should return the prescribed observers for the current epoch', async () => {
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([]);
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': baselineGatewayData,
      },
      // no distributions
    };
    const { result } = await getPrescribedObservers(state);
    expect(result).toEqual([]);
  });
});
