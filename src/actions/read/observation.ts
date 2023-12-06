import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
} from '../../constants';
import { getEpochStart, getPrescribedObservers } from '../../observers';
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
  const { settings, gateways } = state;
  const currentEpochStartHeight = getEpochStart({
    startHeight: new BlockHeight(DEFAULT_START_HEIGHT),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    height: new BlockHeight(height || +SmartWeave.block.height),
  });

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.minNetworkJoinStakeAmount,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

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
  { input: { height } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways } = state;
  const currentEpochStartHeight = getEpochStart({
    startHeight: new BlockHeight(DEFAULT_START_HEIGHT),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    height: new BlockHeight(height || +SmartWeave.block.height),
  });

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.minNetworkJoinStakeAmount,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

  return { result: prescribedObservers };
};
