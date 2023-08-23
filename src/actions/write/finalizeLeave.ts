import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the leave period completes
export const finalizeLeave = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractResult> => {
  const { gateways = {}, balances } = state;

  if (!(target in gateways)) {
    throw new ContractError('This target is not a registered gateway.');
  }

  // If end date has passed, finish leave process and return all funds for the gateway operator
  if (
    gateways[target].status !== NETWORK_LEAVING_STATUS ||
    gateways[target].end > +SmartWeave.block.height
  ) {
    throw new ContractError('This Gateway can not leave the network yet');
  }

  // iterate through the targets vaults and add back their vaulted balance to their current balance
  balances[target] = gateways[target].vaults.reduce(
    (totalVaulted, vault) => totalVaulted + vault.balance,
    balances[target],
  );

  // delete the gateway, and update state
  delete gateways[target];
  state.balances = balances;
  state.gateways = gateways;

  return { state };
};
