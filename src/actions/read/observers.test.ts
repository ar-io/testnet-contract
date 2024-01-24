import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  TALLY_PERIOD_BLOCKS,
  TENURE_WEIGHT_TOTAL_BLOCK_COUNT,
} from '../../constants';
import { getBaselineState } from '../../tests/stubs';
import { baselineGatewayData } from '../write/saveObservations.test';
import { getEpoch, getPrescribedObservers } from './observers';

describe('getPrescribedObservers', () => {
  it('should return the prescribed observers for the current epoch', async () => {
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': baselineGatewayData,
      },
      // no distributions
    };
    const { result } = await getPrescribedObservers(state);
    expect(result).toEqual([
      {
        compositeWeight: 1 / TENURE_WEIGHT_TOTAL_BLOCK_COUNT, // gateway started at the same block as the epoch, so it gets the default value
        gatewayAddress: 'a-test-gateway',
        gatewayRewardRatioWeight: 1,
        normalizedCompositeWeight: 1,
        observerAddress: 'fake-observer-wallet',
        observerRewardRatioWeight: 1,
        stake: 10000,
        stakeWeight: 1,
        start: 0,
        tenureWeight: 1 / TENURE_WEIGHT_TOTAL_BLOCK_COUNT, // gateway started at the same block as the epoch, so it gets the default value
      },
    ]);
  });
});

describe('getEpoch', () => {
  const state = getBaselineState();

  it.each([
    'not-a-number',
    +SmartWeave.block.height + 1,
    +state.distributions.epochZeroStartHeight - 1,
  ])(
    'should throw an error when the height is less than epochZeroStartHeight',
    async (invalidHeight: number) => {
      const error = await getEpoch(state, {
        input: { height: invalidHeight },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(ContractError);
      expect(error.message).toEqual(
        'Invalid height. Must be a number less than or equal to the current block height and greater than or equal to the epoch zero start height',
      );
    },
  );

  it('should return the epoch start and end heights when the height is valid', async () => {
    const { result } = await getEpoch(state, {
      input: { height: +SmartWeave.block.height },
    });
    expect(result).toEqual({
      epochStartHeight: 0,
      epochEndHeight: DEFAULT_EPOCH_BLOCK_LENGTH - 1,
      epochDistributionHeight:
        DEFAULT_EPOCH_BLOCK_LENGTH + TALLY_PERIOD_BLOCKS - 1,
      epochZeroStartHeight: state.distributions.epochZeroStartHeight,
      epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    });
  });

  it('should return the epoch start and end heights when the height is not provided', async () => {
    const { result } = await getEpoch(state, { input: { height: undefined } });
    expect(result).toEqual({
      epochStartHeight: 0,
      epochEndHeight: DEFAULT_EPOCH_BLOCK_LENGTH - 1,
      epochDistributionHeight:
        DEFAULT_EPOCH_BLOCK_LENGTH + TALLY_PERIOD_BLOCKS - 1,
      epochZeroStartHeight: state.distributions.epochZeroStartHeight,
      epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    });
  });
});
