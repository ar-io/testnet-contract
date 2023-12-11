import { DEFAULT_EPOCH_BLOCK_LENGTH } from '../../constants';
import {
  getEpochBoundaries,
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
  { input: { target } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;
  const {
    startHeight: currentEpochStartHeight,
    endHeight: currentEpochEndHeight,
  } = getEpochBoundaries({
    lastCompletedEpoch: new BlockHeight(
      distributions.lastCompletedEpochEndHeight || 0,
    ),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochEndHeight: currentEpochEndHeight,
    epochStartHeight: currentEpochStartHeight,
  });

  if (
    prescribedObservers.some(
      (observer) =>
        observer.gatewayAddress === target ||
        observer.observerAddress === target,
    )
  ) {
    // The target with the specified address is found in the prescribedObservers list
    return { result: true };
  } else {
    return { result: false };
  }
};

export const prescribedObservers = async (
  state: IOState,
): Promise<ContractReadResult> => {
  const { settings, gateways, distributions } = state;
  const {
    startHeight: currentEpochStartHeight,
    endHeight: currentEpochEndHeight,
  } = getEpochBoundaries({
    lastCompletedEpoch: new BlockHeight(
      distributions.lastCompletedEpochEndHeight || 0,
    ),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochEndHeight: currentEpochEndHeight,
    epochStartHeight: currentEpochStartHeight,
  });

  return { result: prescribedObservers };
};
