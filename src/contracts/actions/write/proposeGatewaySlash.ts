import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the removal period completes
export const proposeGatewaySlash = async (
  state: ArNSState,
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
    throw new ContractError("Penalty must be a positive integer, between 1 and 75");
  }

  if (!target) {
    throw new ContractError("No target specified");
  }

  const penaltyPercentage = penalty / 100;

  if (target in gateways) {
    // iterate through each gateway vault and slash all balances using the penalty percentage
    for (let i = 0; i < state.gateways[target].vaults.length; i++) {
      const newBalance = Math.floor(state.gateways[target].vaults[i].balance * penaltyPercentage);
      state.gateways[target].vaults[i].balance -= newBalance;
      state.gateways[target].operatorStake -= newBalance;
    };
    // iterate through each delegate and slash all balances using the penalty percentage
    for (const key of Object.keys(state.gateways[target].delegates)) {
      for (let i = 0; i < state.gateways[target].delegates[key].length; i++) {
        // iterate through each delegate's vault
        const newBalance = Math.floor(state.gateways[target].delegates[key][i].balance * penaltyPercentage);
        state.gateways[target].delegates[key][i].balance -= newBalance;
        state.gateways[target].delegatedStake -= newBalance;
      }
  }
  } else {
      throw new ContractError("This target is not a registered gateway.");
  }
  return { state };
};
