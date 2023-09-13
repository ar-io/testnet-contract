import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Begins the process to unlocks the vault of a gateway operator
export const initiateOperatorStakeDecrease = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { settings, gateways = {} } = state;
  const { registry: registrySettings } = settings;
  // TODO: object parse validation
  const { id, qty } = input as any;

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

  if (!Number.isInteger(qty)) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
  }

  if (
    gateways[caller].operatorStake - qty <
    registrySettings.minNetworkJoinStakeAmount
  ) {
    throw new ContractError(
      'Not enough operator stake to maintain the minimum',
    );
  }

  if (
    gateways[caller].vaults[id].balance < qty
  ) {
    throw new ContractError(
      'This vault does not have the amount of tokens requested to withdraw',
    );
  }

  if (
    gateways[caller].vaults[id].start + registrySettings.minLockLength >
    +SmartWeave.block.height
  ) {
    throw new ContractError('This vault has not been locked long enough');
  }

  if (gateways[caller].vaults[id].end === 0) {
    // Unstake a single gateway vault that is active
    // Begin unstake process
    if (gateways[caller].vaults[id].balance === qty) {
      // Set the end date for this vault since it is being closed
      gateways[caller].vaults[id].end =
        +SmartWeave.block.height + registrySettings.operatorStakeWithdrawLength;
    } else {
      // Move the quantity of tokens to a new vault and set the end date.
      gateways[caller].vaults[id].balance -= qty // subtract the quantity from the old vault
      gateways[caller].vaults.push({
        balance: qty, // add the quantity of tokens being withdrawn to the new vault
        start: gateways[caller].vaults[id].start, // Copy the previous vault's start height
        end: +SmartWeave.block.height + registrySettings.operatorStakeWithdrawLength
      });
    }
  } else {
    throw new ContractError(
      `This vault is already being unlocked at ${gateways[caller].vaults[id].end}`,
    );
  }

  // update state
  state.gateways = gateways;
  return { state };
};
