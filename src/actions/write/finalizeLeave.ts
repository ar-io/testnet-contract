import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the leave period completes
export const finalizeLeave = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractResult> => {
  const gateways = state.gateways;
  const balances = state.balances;

  if (!(target in gateways)) {
    throw new ContractError('This target is not a registered gateway.');
  }

  // If end date has passed, finish leave process and return all funds for the gateway operator and their delegates
  if (
<<<<<<< HEAD
    gateways[target].status !== LEAVING_NETWORK_STATUS || 
    gateways[target].end <= +SmartWeave.block.height) {
    throw new ContractError('This Gateway can not leave the network yet');
  }

  // iterate through the targets vaults and return their stakes to their balance
  for (const vault of gateways[target].vaults) {
    balances[target] = balances[target] ?? 0 + vault.balance;
  }

  // iterate through each delegate and return their delegated tokens to their balance
  for (const delegate of Object.keys(gateways[target].delegates)) {
    const totalQtyDelegated = gateways[target].delegates[delegate].reduce((totalQtyDelegated, d) => totalQtyDelegated += d.balance, 0);
=======
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

  // iterate through each delegate and return their delegated tokens to their balance
  for (const delegate of Object.keys(gateways[target].delegates)) {
    const totalQtyDelegated = gateways[target].delegates[delegate].reduce(
      (totalQtyDelegated, d) => (totalQtyDelegated += d.balance),
      0,
    );
>>>>>>> b768f52f0f49bc32172a3794406a4ca1e278444b
    balances[delegate] = balances[delegate] ?? 0 + totalQtyDelegated;
  }

  // delete the gateway, and update state
  delete gateways[target];
  state.balances = balances;
  state.gateways = gateways;

  return { state };
};
