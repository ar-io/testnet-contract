import { EPOCH_BLOCK_LENGTH, GATEWAY_REGISTRY_SETTINGS } from '../../constants';
import {
  getEpochBoundariesForHeight,
  getObserverWeightsForEpoch,
} from '../../observers';
import {
  BlockHeight,
  ContractReadResult,
  Gateway,
  IOState,
  ObserverWeights,
  PstAction,
  WalletAddress,
  WeightedObserver,
} from '../../types';

export const getGateway = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractReadResult & any> => {
  const { gateways = {}, distributions } = state;
  if (!(target in gateways)) {
    throw new ContractError(`No gateway found with wallet address ${target}.`);
  }

  // TODO: allow getting gateway by observer address
  const gateway = gateways[target];

  const { epochStartHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  const observerWeights = getObserverWeightsForEpoch({
    gateways,
    epochStartHeight,
    minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
  }).find(
    (observer: WeightedObserver) =>
      observer.gatewayAddress === target || observer.observerAddress === target,
  );

  const gatewayWithWeights = {
    ...gateway,
    // computed weights based on the current epoch
    weights: {
      stakeWeight: observerWeights?.stakeWeight || 0,
      tenureWeight: observerWeights?.tenureWeight || 0,
      gatewayRewardRatioWeight: observerWeights?.gatewayRewardRatioWeight || 0,
      observerRewardRatioWeight:
        observerWeights?.observerRewardRatioWeight || 0,
      compositeWeight: observerWeights?.compositeWeight || 0,
      normalizedCompositeWeight:
        observerWeights?.normalizedCompositeWeight || 0,
    },
  };

  return {
    result: gatewayWithWeights,
  };
};

export const getGateways = async (
  state: IOState,
): Promise<ContractReadResult> => {
  const { gateways, distributions } = state;

  const { epochStartHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  const allObserverWeights = getObserverWeightsForEpoch({
    gateways,
    epochStartHeight,
    minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
  });

  const gatewaysWithWeights = Object.keys(gateways).reduce(
    (
      acc: Record<
        WalletAddress,
        Gateway & {
          weights: ObserverWeights;
        }
      >,
      address,
    ) => {
      const observerWeights: WeightedObserver | undefined =
        allObserverWeights.find(
          (observer: WeightedObserver) => observer.gatewayAddress === address,
        );

      const gateway = gateways[address];

      const gatewayWithWeights = {
        ...gateway,
        // computed weights based on the current epoch
        weights: {
          stakeWeight: observerWeights?.stakeWeight || 0,
          tenureWeight: observerWeights?.tenureWeight || 0,
          gatewayRewardRatioWeight:
            observerWeights?.gatewayRewardRatioWeight || 0,
          observerRewardRatioWeight:
            observerWeights?.observerRewardRatioWeight || 0,
          compositeWeight: observerWeights?.compositeWeight || 0,
          normalizedCompositeWeight:
            observerWeights?.normalizedCompositeWeight || 0,
        },
      };

      acc[address] = gatewayWithWeights;
      return acc;
    },
    {},
  );

  return {
    result: gatewaysWithWeights,
  };
};
