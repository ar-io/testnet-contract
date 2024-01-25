import {
  GATEWAY_REGISTRY_SETTINGS,
  NETWORK_LEAVING_STATUS,
} from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Begins the process to unlocks the vault of a gateway operator
export const decreaseOperatorStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { gateways = {} } = state;
  // TODO: object parse validation
  const { qty } = input as { qty: number };

  if (!(caller in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network and cannot have its stake adjusted',
    );
  }

  if (
    gateways[caller].operatorStake - qty <
    GATEWAY_REGISTRY_SETTINGS.minNetworkJoinStakeAmount
  ) {
    throw new ContractError(
      `${qty} is not enough operator stake to maintain the minimum of ${GATEWAY_REGISTRY_SETTINGS.minNetworkJoinStakeAmount}`,
    );
  }

  // Remove the tokens from the operator stake
  gateways[caller].operatorStake -= qty;

  // Add tokens to a vault that unlocks after the withdrawal period ends
  gateways[caller].vaults[SmartWeave.transaction.id] = {
    balance: qty,
    start: +SmartWeave.block.height,
    end:
      +SmartWeave.block.height +
      GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength,
  };

  // update state
  state.gateways = gateways;
  return { state };
};
