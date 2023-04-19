import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Unlocks the vault of a gateway operator
export const finalizeOperatorStakeDecrease = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractResult> => {
  const gateways = state.gateways;

  if (!(target in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  // Finish unstake process for any ended gateway operator vaults and return tokens
  for (let i = 0; i < gateways[caller].vaults.length; i += 1) {
    if (
      gateways[target].vaults[i].end !== 0 &&
      gateways[target].vaults[i].end <= +SmartWeave.block.height
    ) {
      if (target in state.balances) {
        state.balances[target] += gateways[target].vaults[i].balance;
      } else {
        state.balances[target] = gateways[target].vaults[i].balance;
      }
      state.gateways[target].operatorStake -=
        state.gateways[target].vaults[i].balance; // deduct from operator stake
      delete state.gateways[target].vaults[i]; // clean up this vault
    }
  }
  return { state };
};
