import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Unlocks the vault of a gateway operator
export const finalizeOperatorStakeDecrease = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractResult> => {
  const { gateways = {}, balances } = state;

  if (!(target in gateways)) {
    throw new ContractError('This target is not a registered gateway');
  }

  // Finish unstake process for any ended gateway operator vaults and return tokens
  const vaults = gateways[caller].vaults;
  const remainingVaults = [];
  for (const vault of vaults) {
    if (vault.end !== 0 && vault.end <= +SmartWeave.block.height) {
      balances[target] = (balances[target] ?? 0) + vault.balance;
    } else {
      remainingVaults.push(vault);
    }
  }

  // update vaults with only the vaults that havent been unlocked
  gateways[target].vaults = remainingVaults;

  // update state
  state.balances = balances;
  state.gateways = gateways;
  return { state };
};
