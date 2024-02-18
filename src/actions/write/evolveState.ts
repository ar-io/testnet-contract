import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
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
        autoStaking: false,
      },
    };
    state.gateways[gatewayAddress] = updatedGateway;
  }

  return { state };
};
