import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const undelegateStake = async (
  state: ArNSState,
  { caller, input: { id, target } }: PstAction
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;

  if (!(target in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }
  if (
    !(
      caller in gateways[target].delegates &&
      gateways[target].delegates[caller].length
    )
  ) {
    throw new ContractError("No stake to undelegate");
  }
  if (
    id &&
    (typeof id !== "number" ||
      (id >= gateways[target].delegates[caller].length && id < 0))
  ) {
    throw new ContractError("Invalid vault index provided");
  }

  if (
    typeof id === "number" &&
    id < gateways[target].delegates[caller].length &&
    id >= 0
  ) {
    // Undelegate a single stake
    if (gateways[target].delegates[caller][id].end === 0) {
      // Begin undelegate process
      state.gateways[target].delegates[caller][id].end =
        +SmartWeave.block.height + settings.delegatedStakeWithdrawLength;
    } else if (
      gateways[target].delegates[caller][id].end <= +SmartWeave.block.height
    ) {
      // Finish undelegate process for this specific vault and return funds to caller
      if (caller in state.balances) {
        state.balances[caller] +=
          gateways[target].delegates[caller][id].balance;
      } else {
        state.balances[caller] = gateways[target].delegates[caller][id].balance;
      }
      state.gateways[target].stake -=
        state.gateways[target].delegates[caller][id].balance; // deduct from primary gateway stake
      state.gateways[target].delegates[caller][id].balance = 0; // zero out this balance but do not delete the record
    } else {
      throw new ContractError("This stake cannot be undelegated yet");
    }
  } else {
    // undelegate all stakes
    for (let i = 0; i < gateways[target].delegates[caller].length; i++) {
      if (gateways[target].delegates[caller][i].end === 0) {
        // Begin undelegate process
        state.gateways[target].delegates[caller][i].end =
          +SmartWeave.block.height + settings.delegatedStakeWithdrawLength;
      } else if (
        gateways[target].delegates[caller][i].end <= +SmartWeave.block.height
      ) {
        // Finish undelegate process for this specific vault and return funds to caller
        if (caller in state.balances) {
          state.balances[caller] +=
            gateways[target].delegates[caller][i].balance;
        } else {
          state.balances[caller] =
            gateways[target].delegates[caller][i].balance;
        }
        // gateways[target].delegates[caller].splice(i, 1); can remove entire stake
        state.gateways[target].stake -=
          state.gateways[target].delegates[caller][i].balance; // deduct from primary gateway stake
        state.gateways[target].delegates[caller][i].balance = 0; // zero out this balance but do not delete the record
      } else {
        throw new ContractError("This stake cannot be undelegated yet");
      }
    }
  }
  return { state };
};
