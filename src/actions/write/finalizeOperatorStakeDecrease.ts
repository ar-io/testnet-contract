import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Unlocks the vault of a gateway operator
export const finalizeOperatorStakeDecrease = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractResult> => {
  const gateways = state.gateways;
  const balances = state.balances;

  if (!(target in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  // Finish unstake process for any ended gateway operator vaults and return tokens
  const vaults = gateways[caller].vaults;
  const remainingVaults = [];
  for (const vault of vaults) {
    if (
      vault.end !== 0 &&
      vault.end <= +SmartWeave.block.height
    ) {
      balances[target] = (balances[target] ?? 0) + vault.balance;
      gateways[target].operatorStake -= vault.balance;
      continue;
    }
    remainingVaults.push(vault);
  }

  // update vaults
  gateways[caller].vaults = remainingVaults;

  // update state
  state.balances = balances;
  state.gateways = gateways;
  return { state };
};
