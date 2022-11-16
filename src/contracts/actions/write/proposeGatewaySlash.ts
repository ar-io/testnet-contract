import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the removal period completes
export const proposeGatewaySlash = async (
  state: IOState,
  { caller, input: { target, penalty } }: PstAction
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;
  const owner = state.owner;

  // This is to be replaced with on-chain governance
  if (caller !== owner) {
    throw new ContractError(`Caller is not the owner of the ArNS!`);
  }

  // penalty must be a positive number between 1-75%
  if (!Number.isInteger(penalty) || penalty > 75 || penalty <= 0) {
    throw new ContractError(
      "Penalty must be a positive integer, between 1 and 75"
    );
  }

  if (!target) {
    throw new ContractError("No target specified");
  }

  const penaltyPercentage = penalty / 100;

  if (target in gateways) {
    // iterate through each gateway vault and slash all balances using the penalty percentage
    for (let i = 0; i < state.gateways[target].vaults.length; i++) {
      const newBalance = Math.floor(
        state.gateways[target].vaults[i].balance * penaltyPercentage
      );
      state.gateways[target].vaults[i].balance -= newBalance;
      state.gateways[target].operatorStake -= newBalance;
    }
    // iterate through each delegate and slash all balances using the penalty percentage
    for (const key of Object.keys(state.gateways[target].delegates)) {
      for (let i = 0; i < state.gateways[target].delegates[key].length; i++) {
        // iterate through each delegate's vault
        const newBalance = Math.floor(
          state.gateways[target].delegates[key][i].balance * penaltyPercentage
        );
        state.gateways[target].delegates[key][i].balance -= newBalance;
        state.gateways[target].delegatedStake -= newBalance;
      }
    }
  } else {
    throw new ContractError("This target is not a registered gateway.");
  }

  if (state.gateways[target].operatorStake < settings.minGatewayStakeAmount) {
    // This gateway does not have minimum stake and should be ejected
    for (let i = 0; i < state.gateways[target].vaults.length; i++) {
      // iterate through each gateway vault
      if (target in state.balances) {
        state.balances[target] += state.gateways[target].vaults[i].balance;
      } else {
        state.balances[target] = state.gateways[target].vaults[i].balance; // deduct from primary gateway stake
      }
      state.gateways[target].operatorStake -=
        state.gateways[target].vaults[i].balance;
      state.gateways[target].vaults[i].balance = 0; // zero out this balance
    }
    for (const key of Object.keys(state.gateways[target].delegates)) {
      // iterate through each delegate
      for (let i = 0; i < state.gateways[target].delegates[key].length; i++) {
        // iterate through each delegate's vault
        if (key in state.balances) {
          state.balances[key] +=
            state.gateways[target].delegates[key][i].balance;
        } else {
          state.balances[key] =
            state.gateways[target].delegates[key][i].balance;
        }
        state.gateways[target].delegatedStake -=
          state.gateways[target].delegates[key][i].balance; // deduct from primary gateway stake
        state.gateways[target].delegates[key][i].balance = 0; // zero out this balance
      }
    }
    delete state.gateways[target]; // clean up the state
  }
  return { state };
};
