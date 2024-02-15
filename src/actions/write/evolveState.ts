import {
  MIN_DELEGATED_STAKE,
  NON_CONTRACT_OWNER_MESSAGE,
} from '../../constants';
import { ContractWriteResult, Gateway, IOState, PstAction } from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  for (const [gatewayAddress, gateway] of Object.entries(state.gateways)) {
    const updatedGateway: Gateway = {
      ...gateway,
      settings: {
        ...gateway.settings,
        allowDelegatedStaking: false,
        minDelegatedStake: MIN_DELEGATED_STAKE,
        delegateRewardShareRatio: 0,
      },
      delegates: {},
      totalDelegatedStake: 0,
    };
    state.gateways[gatewayAddress] = updatedGateway;
  }

  return { state };
};
