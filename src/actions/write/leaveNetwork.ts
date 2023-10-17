import { NETWORK_LEAVING_STATUS } from '../../constants';
import { BlockHeight, ContractResult, IOState, PstAction } from '../../types';
import { isGatewayEligibleToLeave } from '../../utilities';

declare const ContractError: any;
declare const SmartWeave: any;

// Begins the network leave process for a gateway operator
export const leaveNetwork = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const settings = state.settings.registry;
  const gateways = state.gateways;
  const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

  if (!gateways[caller]) {
    throw new ContractError('This target is not a registered gateway.');
  }

  if (
    !isGatewayEligibleToLeave({
      gateway: gateways[caller],
      currentBlockHeight,
      registrySettings: settings,
    })
  ) {
    throw new ContractError(
      `The gateway is not eligible to leave the network. It must be joined for a minimum of ${settings.minGatewayJoinLength} blocks and can not already be leaving the network.`,
    );
  }

  const endHeight = +SmartWeave.block.height + settings.gatewayLeaveLength;

  // Add tokens to a vault that unlocks after the withdrawal period ends
  gateways[caller].vaults.push({
    balance: gateways[caller].operatorStake,
    start: +SmartWeave.block.height,
    end: endHeight,
  });

  // set all the vaults to unlock at the end of the withdrawal period
  for (const vault of gateways[caller].vaults) {
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
