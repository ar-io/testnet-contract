import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
} from '../../constants';
import { ContractReadResult, IOState, PstAction } from '../../types';
import { getEpochStart, getPrescribedObservers } from '../../utilities';

export const prescribedObserver = async (
  state: IOState,
  { input: { target, height } }: PstAction,
): Promise<ContractReadResult> => {
  const { settings, gateways } = state;
  if (!height) {
    height = +SmartWeave.block.height;
  }

  const currentEpochStartHeight = getEpochStart({
    startHeight: DEFAULT_START_HEIGHT,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: height,
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
): Promise<ContractResult> => {
  const { settings, gateways } = state;
  if (!height) {
    height = +SmartWeave.block.height;
  }
  const currentEpochStartHeight = getEpochStart({
    startHeight: DEFAULT_START_HEIGHT,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: height,
  });

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.minNetworkJoinStakeAmount,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

  return { result: prescribedObservers };
};
