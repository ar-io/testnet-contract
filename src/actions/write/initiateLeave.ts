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
    state.gateways[caller].vaults[0].start + settings.minGatewayJoinLength >
    +SmartWeave.block.height
  ) {
    throw new ContractError('This Gateway has not been joined long enough');
  }

  // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
  for (let i = 0; i < state.gateways[caller].vaults.length; i++) {
    // iterate through each gateway vault and set the end date if it is not already in the process of being withdrawn
    if (state.gateways[caller].vaults[i].end === 0) {
      state.gateways[caller].vaults[i].end =
        +SmartWeave.block.height + settings.gatewayLeaveLength;
    }
  }
  state.gateways[caller].status = LEAVING_NETWORK_STATUS;
  return { state };
};
