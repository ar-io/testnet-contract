import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  TALLY_PERIOD_BLOCKS,
} from '../../constants';
import {
  getEpochBoundariesForHeight,
  getObserverWeightsForEpoch,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  BlockHeight,
  ContractReadResult,
  IOState,
  PstAction,
  WeightedObserver,
} from '../../types';

export const getObserver = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;

  const { epochStartHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  const observerWeights = getObserverWeightsForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight,
    distributions,
  });

  const observer = observerWeights.find(
    (observer: WeightedObserver) =>
      observer.gatewayAddress === target || observer.observerAddress === target,
  );

  if (!observer) {
    throw new ContractError(
      `No gateway or observer found with wallet address ${target}.`,
    );
  }
  return {
    result: observer,
  };
};

export const getPrescribedObservers = async (
  state: IOState,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;

  const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight,
    epochEndHeight,
    distributions,
  });

  return { result: prescribedObservers };
};

export async function getEpoch(
  state: IOState,
  { input: { height } }: { input: { height: number } },
): Promise<ContractReadResult> {
  const { distributions } = state;

  const requestedHeight = height || +SmartWeave.block.height;

  if (
    isNaN(requestedHeight) ||
    height < distributions.epochZeroStartHeight ||
    // TODO: should we allow users to query future epochs?
    height > +SmartWeave.block.height
  ) {
    throw new ContractError(
      'Invalid height. Must be a number less than or equal to the current block height',
    );
  }

  const { epochStartHeight: epochStartHeight, epochEndHeight: epochEndHeight } =
    getEpochBoundariesForHeight({
      currentBlockHeight: new BlockHeight(requestedHeight),
      epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
      epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    });

  return {
    result: {
      epochStartHeight: epochStartHeight.valueOf(),
      epochEndHeight: epochEndHeight.valueOf(),
      epochZeroStartHeight: distributions.epochZeroStartHeight,
      epochDistributionHeight: epochEndHeight.valueOf() + TALLY_PERIOD_BLOCKS,
      epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    },
  };
}
