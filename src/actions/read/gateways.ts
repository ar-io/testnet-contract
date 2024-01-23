import {
  getEpochBoundariesForHeight,
  getObserverWeightsForEpoch,
} from 'src/observers';

import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import {
  BlockHeight,
  ContractReadResult,
  Gateway,
  IOState,
  PstAction,
  WeightedObserver,
} from '../../types';

export const getGateway = async (
  state: IOState,
  { input: { target } }: PstAction,
): Promise<ContractReadResult & any> => {
  const { gateways = {} } = state;
  if (!(target in gateways)) {
    throw new ContractError('This target does not have a registered gateway.');
  }
  const gatewayObj = gateways[target];
  return {
    result: gatewayObj,
  };
};

export const getGatewayTotalStake = async (
  state: IOState,
  { input: { target } }: PstAction,
): Promise<ContractReadResult & any> => {
  const { gateways = {} } = state;
  if (!(target in gateways)) {
    throw new ContractError('This target does not have a registered gateway.');
  }
  const gatewayTotalStake = gateways[target].operatorStake;
  return {
    result: gatewayTotalStake,
  };
};

export const getGatewayRegistry = async (
  state: IOState,
): Promise<ContractReadResult & any> => {
  const { gateways = {} } = state;
  return {
    result: gateways,
  };
};

export const getRankedGatewayRegistry = async (
  state: IOState,
): Promise<ContractReadResult & any> => {
  const { gateways = {} } = state;
  // Filters the gateway registry for active gateways only
  const filteredGateways: { [address: string]: Gateway } = {};
  Object.keys(gateways).forEach((address) => {
    if (gateways[address].status === NETWORK_JOIN_STATUS) {
      filteredGateways[address] = gateways[address];
    }
  });

  // Ranks the gateway registry by highest stake first
  const rankedGateways: { [address: string]: Gateway } = {};
  Object.keys(filteredGateways)
    .sort((addressA, addressB) => {
      const gatewayA = filteredGateways[addressA];
      const gatewayB = filteredGateways[addressB];
      const totalStakeA = gatewayA.operatorStake;
      const totalStakeB = gatewayB.operatorStake;
      return totalStakeB - totalStakeA;
    })
    .forEach((address) => {
      rankedGateways[address] = filteredGateways[address];
    });

  return {
    result: rankedGateways,
  };
};

export const getGatewayObserverWeights = async (
  state: IOState,
  { caller }: PstAction,
): Promise<{
  result: WeightedObserver;
}> => {
  const { gateways = {} } = state;
  if (!(caller in gateways)) {
    throw new ContractError('This target does not have a registered gateway.');
  }

  const { epochStartHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(
      state.distributions.epochZeroStartHeight,
    ),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  const weightedObservers = getObserverWeightsForEpoch({
    gateways,
    distributions: state.distributions,
    epochStartHeight: epochStartHeight,
    minNetworkJoinStakeAmount:
      state.settings.registry.minNetworkJoinStakeAmount,
  });

  const observerWeights = weightedObservers.find(
    (observer) =>
      observer.gatewayAddress === caller || observer.observerAddress === caller,
  );

  if (!observerWeights) {
    throw new ContractError(`No gateway or observer found for ${caller}.`);
  }

  return {
    result: observerWeights,
  };
};
