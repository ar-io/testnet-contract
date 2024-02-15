import {
  GATEWAY_REGISTRY_SETTINGS,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  NETWORK_LEAVING_STATUS,
} from '../../constants';
import { ContractWriteResult, Gateway, IOState, PstAction } from '../../types';

// Begins the process to unlocks the vault of a gateway operator
export const decreaseOperatorStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { gateways } = state;
  const qty = input.qty;

  if (isNaN(qty) || qty <= 0) {
    throw new ContractError(INVALID_INPUT_MESSAGE);
  }

  if (!(caller in gateways)) {
    throw new ContractError(INVALID_GATEWAY_EXISTS_MESSAGE);
  }

  if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'Gateway is leaving the network and cannot accept additional stake.',
    );
  }

  if (
    gateways[caller].operatorStake - qty <
    GATEWAY_REGISTRY_SETTINGS.minOperatorStake
  ) {
    throw new ContractError(
      `${qty} is not enough operator stake to maintain the minimum of ${GATEWAY_REGISTRY_SETTINGS.minOperatorStake}`,
    );
  }

  const updatedGateway: Gateway = {
    ...gateways[caller],
    operatorStake: gateways[caller].operatorStake - qty,
    vaults: {
      ...gateways[caller].vaults,
      [SmartWeave.transaction.id]: {
        balance: qty,
        start: +SmartWeave.block.height,
        end:
          +SmartWeave.block.height +
          GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength,
      },
    },
  };
  // Remove the tokens from the operator stake
  state.gateways[caller] = updatedGateway;
  return { state };
};
