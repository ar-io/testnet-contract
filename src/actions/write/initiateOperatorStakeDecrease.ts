import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Begins the process to unlocks the vault of a gateway operator
export const initiateOperatorStakeDecrease = async (
  state: IOState,
  { caller, input: { id } }: PstAction,
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network and cannot have its stake adjusted',
    );
  }

  if (typeof id !== 'number' || id > gateways[caller].vaults.length || id < 0) {
    throw new ContractError('Invalid vault index provided');
  }

  if (
    gateways[caller].operatorStake - gateways[caller].vaults[id].balance <
    settings.minNetworkJoinStakeAmount
  ) {
    throw new ContractError(
      'Not enough operator stake to maintain the minimum',
    );
  }

  if (
    gateways[caller].vaults[id].start + settings.minLockLength >
    +SmartWeave.block.height
  ) {
    throw new ContractError('This vault has not been locked long enough');
  }

  if (gateways[caller].vaults[id].end === 0) {
    // Unstake a single gateway vault that is active
    // Begin unstake process
    gateways[caller].vaults[id].end =
      +SmartWeave.block.height + settings.operatorStakeWithdrawLength;
  } else {
    throw new ContractError(
      `This vault is already being unlocked at ${gateways[caller].vaults[id].end}`,
    );
  }

  // update state
  state.gateways = gateways;
  return { state };
};
