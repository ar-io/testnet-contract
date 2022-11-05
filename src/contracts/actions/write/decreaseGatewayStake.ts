import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const decreaseGatewayStake = async (
  state: ArNSState,
  { caller, input: { id, qty } }: PstAction
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  if (
    id &&
    (typeof id !== "number" || (id >= gateways[caller].vaults.length && id < 0))
  ) {
    throw new ContractError("Invalid vault index provided");
  }

  if (gateways[caller].stake - qty < settings.minGatewayStakeAmount) {
    throw new ContractError("Not enough stake to maintain the minimum");
  }

  if (
    typeof id === "number" &&
    id < gateways[caller].vaults.length &&
    id >= 0
  ) {
    // Unstake a single stake
    if (gateways[caller].vaults[id].end === 0) {
      // Begin unstake process
      state.gateways[caller].vaults[id].end =
        +SmartWeave.block.height + settings.delegatedStakeWithdrawLength;
    } else if (gateways[caller].vaults[id].end <= +SmartWeave.block.height) {
      // Finish unstake process for this specific vault and return funds to gateway operator
      if (caller in state.balances) {
        state.balances[caller] += gateways[caller].vaults[id].balance;
      } else {
        state.balances[caller] = gateways[caller].vaults[id].balance;
      }
      state.gateways[caller].stake -= state.gateways[caller].vaults[id].balance; // deduct from primary gateway stake
      state.gateways[caller].vaults[id].balance = 0; // zero out this balance but do not delete the record
    } else {
      throw new ContractError("This stake cannot be decreased yet yet");
    }
  } else {
    // undelegate all stakes
    for (let i = 0; i < gateways[caller].vaults.length; i++) {
      if (gateways[caller].vaults[i].end === 0) {
        // Begin undelegate process
        state.gateways[caller].vaults[i].end =
          +SmartWeave.block.height + settings.delegatedStakeWithdrawLength;
      } else if (gateways[caller].vaults[i].end <= +SmartWeave.block.height) {
        // Finish undelegate process for this specific vault and return funds to caller
        if (caller in state.balances) {
          state.balances[caller] += gateways[caller].vaults[i].balance;
        } else {
          state.balances[caller] = gateways[caller].vaults[i].balance;
        }
        // gateways[target].delegates[caller].splice(i, 1); can remove entire stake
        state.gateways[caller].stake -=
          state.gateways[caller].vaults[i].balance; // deduct from primary gateway stake
        state.gateways[caller].vaults[i].balance = 0; // zero out this balance but do not delete the record
      } else {
        throw new ContractError("This stake cannot be decreased yet");
      }
    }
  }
  return { state };
};
