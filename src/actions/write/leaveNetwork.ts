import { NETWORK_LEAVING_STATUS } from '../../constants';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
} from '../../types';
import { isGatewayEligibleToLeave } from '../../utilities';

// Begins the network leave process for a gateway operator
export const leaveNetwork = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const settings = state.settings.registry;
  const gateways = state.gateways;
  const gateway = gateways[caller];
  const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

  if (!gateway) {
    throw new ContractError('This target is not a registered gateway.');
  }

  if (
    !isGatewayEligibleToLeave({
      gateway,
      currentBlockHeight,
      minimumGatewayJoinLength: new BlockHeight(settings.minGatewayJoinLength),
    })
  ) {
    throw new ContractError(
      `The gateway is not eligible to leave the network. It must be joined for a minimum of ${settings.minGatewayJoinLength} blocks and can not already be leaving the network. Current status: ${gateways[caller].status}`,
    );
  }

  const endHeight = +SmartWeave.block.height + settings.gatewayLeaveLength;

  // Add tokens to a vault that unlocks after the withdrawal period ends
  gateways[caller].vaults[SmartWeave.transaction.id] = {
    balance: gateways[caller].operatorStake,
    start: +SmartWeave.block.height,
    end: endHeight,
  };

  // set all the vaults to unlock at the end of the withdrawal period
  for (const vault of Object.values(gateway.vaults)) {
    vault.end = endHeight;
  }

  // Remove all tokens from the operator's stake
  gateways[caller].operatorStake = 0;

  // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
  gateways[caller].end = +SmartWeave.block.height + settings.gatewayLeaveLength;
  gateways[caller].status = NETWORK_LEAVING_STATUS;

  // set state
  state.gateways = gateways;
  return { state };
};
