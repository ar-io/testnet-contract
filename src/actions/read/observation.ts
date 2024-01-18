import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  TALLY_PERIOD_BLOCKS,
} from '../../constants';
import {
  getEpochBoundariesForHeight,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  BlockHeight,
  ContractReadResult,
  IOState,
  PstAction,
  WeightedObserver,
} from '../../types';

export const prescribedObserver = async (
  state: IOState,
  { input: { target, height } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;

  const requestedHeight = height || +SmartWeave.block.height;

  if (
    isNaN(requestedHeight) ||
    height < distributions.epochZeroStartHeight ||
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

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight,
    epochEndHeight,
    distributions,
  });

  // The target with the specified address is found in the prescribedObservers list
  return {
    result: prescribedObservers.some(
      (observer: WeightedObserver) =>
        observer.observerAddress === target ||
        observer.gatewayAddress === target,
    ),
  };
};

export const prescribedObservers = async (
  state: IOState,
  { input: { height } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;

  const requestedHeight = height || +SmartWeave.block.height;

  if (
    isNaN(requestedHeight) ||
    height < distributions.epochZeroStartHeight ||
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
