import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  GATEWAY_REGISTRY_SETTINGS,
  TENURE_WEIGHT_PERIOD,
} from '../../constants';
import {
  getBaselineState,
  stubbedGatewayData,
  stubbedGateways,
  stubbedPrescribedObservers,
} from '../../tests/stubs';
import { getEpoch, getPrescribedObservers } from './observers';

describe('getPrescribedObservers', () => {
  it('should return the prescribed observers for the current epoch from state', async () => {
    const state = {
      ...getBaselineState(),
      gateways: stubbedGateways,
      prescribedObservers: {
        [0]: stubbedPrescribedObservers,
      },
      // no distributions
    };
    const { result } = await getPrescribedObservers(state);
    expect(result).toEqual(state.prescribedObservers[0]);
  });
});

it('should return the current array of prescribed observer if not set in state yet', async () => {
  const state = {
    ...getBaselineState(),
    gateways: {
      // only this gateway will be prescribed
      'a-test-gateway': stubbedGatewayData,
    },
    prescribedObservers: {
      // some other epochs prescribed observers
      [1]: stubbedPrescribedObservers,
    },
    // no distributions
  };
  const { result } = await getPrescribedObservers(state);
  expect(result).toEqual([
    {
      gatewayAddress: 'a-test-gateway',
      observerAddress: stubbedGatewayData.observerWallet,
      gatewayRewardRatioWeight: 1,
      observerRewardRatioWeight: 1,
      stake: stubbedGatewayData.operatorStake,
      start: 0,
      stakeWeight:
        stubbedGatewayData.operatorStake /
        GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
      tenureWeight: 1 / TENURE_WEIGHT_PERIOD, // the gateway started at the same time as the epoch
      compositeWeight: 1 / TENURE_WEIGHT_PERIOD,
      normalizedCompositeWeight: 1,
    },
  ]);
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
      epochPeriod: 0,
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
      epochPeriod: 0,
      epochDistributionHeight:
        EPOCH_BLOCK_LENGTH + EPOCH_DISTRIBUTION_DELAY - 1,
      epochZeroStartHeight: state.distributions.epochZeroStartHeight,
      epochBlockLength: EPOCH_BLOCK_LENGTH,
    });
  });

  it('should return the epoch start and end heights when the height is in the future', async () => {
    const { result } = await getEpoch(state, {
      input: { height: SmartWeave.block.height + EPOCH_BLOCK_LENGTH + 1 },
    });
    const futureEpochStartHeight = EPOCH_BLOCK_LENGTH;
    const futureEpochEndHeight =
      futureEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;

    expect(result).toEqual({
      epochStartHeight: futureEpochStartHeight,
      epochEndHeight: futureEpochEndHeight,
      epochPeriod: 1,
      epochDistributionHeight: futureEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
      epochZeroStartHeight: state.distributions.epochZeroStartHeight,
      epochBlockLength: EPOCH_BLOCK_LENGTH,
    });
  });
});
