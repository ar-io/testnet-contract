import { DEFAULT_EPOCH_BLOCK_LENGTH } from '../../constants';
import {
  getEligibleGatewaysForEpoch,
  getEpochBoundariesForHeight,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  BlockHeight,
  ContractReadResult,
  IOState,
  PstAction,
} from '../../types';

export const prescribedObserver = async (
  state: IOState,
  { input: { target, height } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;

  let epochStartHeight = new BlockHeight(distributions.epochStartHeight);
  let epochEndHeight = new BlockHeight(distributions.epochEndHeight);

  if (height) {
    // nobody is prescribed until after the first epoch starts
    if (height < distributions.epochZeroStartHeight) {
      return { result: false };
    }

    const {
      epochStartHeight: previousEpochStartHeight,
      epochEndHeight: previousEpochEndHeight,
    } = getEpochBoundariesForHeight({
      currentBlockHeight: new BlockHeight(height),
      epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
      epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    });

    epochStartHeight = previousEpochStartHeight;
    epochEndHeight = previousEpochEndHeight;
  }

  // TODO: add a read interaction to get the current height epoch boundaries
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    eligibleGateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight: epochStartHeight,
    distributions,
  });

  // The target with the specified address is found in the prescribedObservers list
  return {
    result: prescribedObservers.some(
      (observer) =>
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

  let epochStartHeight = new BlockHeight(distributions.epochStartHeight);
  let epochEndHeight = new BlockHeight(distributions.epochEndHeight);

  if (height) {
    // nobody is prescribed until after the first epoch starts
    if (height < distributions.epochZeroStartHeight) {
      return { result: false };
    }

    const {
      epochStartHeight: previousEpochStartHeight,
      epochEndHeight: previousEpochEndHeight,
    } = getEpochBoundariesForHeight({
      currentBlockHeight: new BlockHeight(height),
      epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
      epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    });

    epochStartHeight = previousEpochStartHeight;
    epochEndHeight = previousEpochEndHeight;
  }

  // TODO: add a read interaction to get the current height epoch boundaries
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    eligibleGateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight: epochStartHeight,
    distributions,
  });

  return { result: prescribedObservers };
};

export async function getEpoch(
  state: IOState,
  { input: { height } }: { input: { height: number } },
): Promise<ContractReadResult> {
  const { distributions } = state;

  let epochStartHeight = new BlockHeight(distributions.epochStartHeight);
  let epochEndHeight = new BlockHeight(distributions.epochEndHeight);

  if (height) {
    if (
      isNaN(height) ||
      height < distributions.epochZeroStartHeight ||
      height > +SmartWeave.block.height
    ) {
      throw new ContractError(
        'Invalid height. Must be a number less than or equal to the current block height',
      );
    }

    const {
      epochStartHeight: previousEpochStartHeight,
      epochEndHeight: previousEpochEndHeight,
    } = getEpochBoundariesForHeight({
      currentBlockHeight: new BlockHeight(height),
      epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
      epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    });

    epochStartHeight = previousEpochStartHeight;
    epochEndHeight = previousEpochEndHeight;
  }

  return {
    result: {
      epochStartHeight: epochStartHeight.valueOf(),
      epochEndHeight: epochEndHeight.valueOf(),
      epochZeroStartHeight: distributions.epochZeroStartHeight,
      epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    },
  };
}
