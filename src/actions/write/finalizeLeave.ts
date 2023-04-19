import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the removal period completes
export const initiateLeave = async (
  state: IOState,
  { caller, input: { target = caller } }: PstAction,
): Promise<ContractResult> => {
  const gateways = state.gateways;

  if (!(target in gateways)) {
    throw new ContractError('This target is not a registered gateway.');
  }

  // If end date has passed, finish leave process and return all funds for the gateway operator and their delegates
  if (
    state.gateways[target].status === 'leavingNetwork' &&
    state.gateways[target].vaults[0].end <= +SmartWeave.block.height
  ) {
    // First, iterate through each gateway vault and remove tokens
    for (let i = 0; i < state.gateways[target].vaults.length; i++) {
      if (target in state.balances) {
        state.balances[target] += state.gateways[target].vaults[i].balance;
      } else {
        // If this gateway never had a balance, then create one
        state.balances[target] = state.gateways[target].vaults[i].balance;
      }
      // deduct from the operator stake and zero out each vault balance
      // this technically isnt needed since state.gateways[target] gets deleted
      state.gateways[target].operatorStake -=
        state.gateways[target].vaults[i].balance;
      state.gateways[target].vaults[i].balance = 0;
    }
    // Second, iterate through each delegate and their vaults and return funds
    for (const key of Object.keys(state.gateways[target].delegates)) {
      for (let i = 0; i < state.gateways[target].delegates[key].length; i++) {
        if (key in state.balances) {
          state.balances[key] +=
            state.gateways[target].delegates[key][i].balance;
        } else {
          // If this delegate never had a balance, then create one
          state.balances[key] =
            state.gateways[target].delegates[key][i].balance;
        }
        // deduct from total gateway delegated stake and zero out each delegate vault balance
        // this technically isnt needed since state.gateways[target] gets deleted
        state.gateways[target].delegatedStake -=
          state.gateways[target].delegates[key][i].balance;
        state.gateways[target].delegates[key][i].balance = 0;
      }
    }
    delete state.gateways[target]; // clean up the state
  } else {
    throw new ContractError('This Gateway can not leave the network yet');
  }
  return { state };
};
