import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Begins the network leave process for a gateway operator
export const initiateLeave = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const settings = state.settings.registry;
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError('This target is not a registered gateway.');
  }

  if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network',
    );
  }

  if (
    gateways[caller].start + settings.minGatewayJoinLength >
    +SmartWeave.block.height
  ) {
    throw new ContractError('This Gateway has not been joined long enough');
  }

  // Add tokens to a vault that unlocks after the withdrawal period ends
  gateways[caller].vaults.push({
    balance: gateways[caller].operatorStake,
    start: +SmartWeave.block.height,
    end: +SmartWeave.block.height + settings.gatewayLeaveLength,
  });

  // Remove all tokens from the operator's stake
  gateways[caller].operatorStake = 0;

  // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
  gateways[caller].end = +SmartWeave.block.height + settings.gatewayLeaveLength;
  gateways[caller].status = NETWORK_LEAVING_STATUS;

  // set state
  state.gateways = gateways;
  return { state };
};
