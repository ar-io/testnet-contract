import { NETWORK_JOIN_STATUS } from '../../constants';
import { ContractResult, Gateway, IOState, PstAction } from '../../types';

declare const ContractError;

export const getGateway = async (
  state: IOState,
  { input: { target } }: PstAction,
): Promise<ContractResult & any> => {
  const gateways = state.gateways;
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
): Promise<ContractResult & any> => {
  const gateways = state.gateways;
  if (!(target in gateways)) {
    throw new ContractError('This target does not have a registered gateway.');
  }
  const gatewayTotalStake =
    gateways[target].operatorStake + gateways[target].delegatedStake;
  return {
    result: gatewayTotalStake,
  };
};

export const getGatewayRegistry = async (
  state: IOState,
): Promise<ContractResult & any> => {
  const gateways = state.gateways;
  return {
    result: gateways,
  };
};

export const getRankedGatewayRegistry = async (
  state: IOState,
): Promise<ContractResult & any> => {
  const gateways = state.gateways;
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
      const totalStakeA = gatewayA.operatorStake + gatewayA.delegatedStake;
      const totalStakeB = gatewayB.operatorStake + gatewayB.delegatedStake;
      return totalStakeB - totalStakeA;
    })
    .forEach((address) => {
      rankedGateways[address] = filteredGateways[address];
    });

  return {
    result: rankedGateways,
  };
};
