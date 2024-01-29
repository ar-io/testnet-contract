import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  TENURE_WEIGHT_PERIOD,
} from '../../constants';
import { getBaselineState, stubbedGatewayData } from '../../tests/stubs';
import { getEpoch, getPrescribedObservers } from './observers';

describe('getPrescribedObservers', () => {
  it('should return the prescribed observers for the current epoch', async () => {
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': stubbedGatewayData,
      },
      // no distributions
    };
    const { result } = await getPrescribedObservers(state);
    expect(result).toEqual([
      {
        compositeWeight: 1 / TENURE_WEIGHT_PERIOD, // gateway started at the same block as the epoch, so it gets the default value
        gatewayAddress: 'a-test-gateway',
        gatewayRewardRatioWeight: 1,
        normalizedCompositeWeight: 1,
        observerAddress: 'test-observer-wallet',
        observerRewardRatioWeight: 1,
        stake: 10000,
        stakeWeight: 1,
        start: 0,
        tenureWeight: 1 / TENURE_WEIGHT_PERIOD, // gateway started at the same block as the epoch, so it gets the default value
      },
    ]);
  });
});

describe('getEpoch', () => {
  const state = getBaselineState();

  it.each(['not-a-number', +SmartWeave.block.height + 1, -1])(
    'should throw an error when the height is less than epochZeroStartHeight',
    async (invalidHeight: number) => {
      await getEpoch(state, {
        input: { height: invalidHeight },
      }).catch((error) => {
        expect(error).toBeInstanceOf(ContractError);
        expect(error.message).toEqual(
          'Invalid height. Must be a number greater than 0.',
        );
      });
    },
  );

  it('should return the epoch start and end heights when the height is valid', async () => {
    const { result } = await getEpoch(state, {
      input: { height: +SmartWeave.block.height },
    });
    expect(result).toEqual({
      epochStartHeight: 0,
      epochEndHeight: EPOCH_BLOCK_LENGTH - 1,
      epochDistributionHeight:
        EPOCH_BLOCK_LENGTH + EPOCH_DISTRIBUTION_DELAY - 1,
      epochZeroStartHeight: state.distributions.epochZeroStartHeight,
      epochBlockLength: EPOCH_BLOCK_LENGTH,
    });
  });

  it('should return the epoch start and end heights when the height is not provided', async () => {
    const { result } = await getEpoch(state, { input: { height: undefined } });
    expect(result).toEqual({
      epochStartHeight: 0,
      epochEndHeight: EPOCH_BLOCK_LENGTH - 1,
      epochDistributionHeight:
        EPOCH_BLOCK_LENGTH + EPOCH_DISTRIBUTION_DELAY - 1,
      epochZeroStartHeight: state.distributions.epochZeroStartHeight,
      epochBlockLength: EPOCH_BLOCK_LENGTH,
    });
  });
});
