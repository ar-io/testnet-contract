import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the removal period completes
export const leaveNetwork = async (
  state: ArNSState,
  { caller }: PstAction
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  if (state.gateways[caller].settings.url !== "") {
    // Begin leave process
    for (let i = 0; i < state.gateways[caller].vaults.length; i++) {
      // iterate through each gateway vault and set the end date
      state.gateways[caller].vaults[i].end =
      +SmartWeave.block.height + settings.gatewayLeaveLength;
    }
    state.gateways[caller].settings.url = "";
    state.gateways[caller].settings.ipAddress = "";

  } else if (state.gateways[caller].settings.url === "" && state.gateways[caller].vaults[0].end <= +SmartWeave.block.height) {
    // Finish leave process and return all funds
    for (let i = 0; i < state.gateways[caller].vaults.length; i++) {
      // iterate through each gateway vault
      if (caller in state.balances) {
        state.balances[caller] += state.gateways[caller].vaults[i].balance;
      } else {
        state.gateways[caller].operatorStake -=
          state.gateways[caller].vaults[i].balance; // deduct from primary gateway stake
      }
      state.gateways[caller].operatorStake -= state.gateways[caller].vaults[i].balance;
      state.gateways[caller].vaults[i].balance = 0; // zero out this balance
    }
    for (const key of Object.keys(state.gateways[caller].delegates)) {
      // iterate through each delegate
      for (let i = 0; i < state.gateways[caller].delegates[key].length; i++) {
        // iterate through each delegate's vault
        if (key in state.balances) {
          state.balances[key] +=
            state.gateways[caller].delegates[key][i].balance;
        } else {
          state.balances[key] =
            state.gateways[caller].delegates[key][i].balance;
        }
        state.gateways[caller].delegatedStake -=
          state.gateways[caller].delegates[key][i].balance; // deduct from primary gateway stake
        state.gateways[caller].delegates[key][i].balance = 0; // zero out this balance
      }
    }
    delete state.gateways[caller]; // clean up the state
  } else {
    throw new ContractError("This Gateway can not leave the network yet");
  }
  return { state };
};
