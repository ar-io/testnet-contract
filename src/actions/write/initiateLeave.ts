import { LEAVING_NETWORK_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the removal period completes
export const initiateLeave = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError('This target is not a registered gateway.');
  }

  if (gateways[caller].status === LEAVING_NETWORK_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network',
    );
  }

  if (
    state.gateways[caller].start + settings.minGatewayJoinLength >
    +SmartWeave.block.height
  ) {
    throw new ContractError('This Gateway has not been joined long enough');
  }

  // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
  state.gateways[caller].end =
    +SmartWeave.block.height + settings.gatewayLeaveLength;
  state.gateways[caller].status = LEAVING_NETWORK_STATUS;
  return { state };
};
