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

  // TODO: validate input with AJV
  const requestedHeight = height || +SmartWeave.block.height;

  // nobody is prescribed until after the first epoch starts
  if (requestedHeight < distributions.epochZeroBlockHeight) {
    return { result: false };
  }

  const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(requestedHeight),
    epochZeroBlockHeight: new BlockHeight(distributions.epochZeroBlockHeight),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

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

  // TODO: validate input with AJV
  const requestedHeight = height || +SmartWeave.block.height;

  // nobody is prescribed until after the first epoch starts
  if (requestedHeight < distributions.epochZeroBlockHeight) {
    return { result: false };
  }

  const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(requestedHeight),
    epochZeroBlockHeight: new BlockHeight(distributions.epochZeroBlockHeight),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

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
