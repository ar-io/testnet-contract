import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Unlocks the vault of a gateway operator
export const decreaseOperatorStake = async (
  state: IOState,
  { caller, input: { id } }: PstAction
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

  if (
    gateways[caller].operatorStake - gateways[caller].vaults[id].balance <
    settings.minGatewayStakeAmount
  ) {
    throw new ContractError(
      "Not enough operator stake to maintain the minimum"
    );
  }

  // Unstake a single gateway vault
  if (gateways[caller].vaults[id].end === 0) {
    // Begin unstake process
    state.gateways[caller].vaults[id].end =
      +SmartWeave.block.height + settings.operatorStakeWithdrawLength;
  } else if (gateways[caller].vaults[id].end <= +SmartWeave.block.height) {
    // Finish unstake process for this specific vault and return funds to gateway operator
    if (caller in state.balances) {
      state.balances[caller] += gateways[caller].vaults[id].balance;
    } else {
      state.balances[caller] = gateways[caller].vaults[id].balance;
    }
    state.gateways[caller].operatorStake -=
      state.gateways[caller].vaults[id].balance; // deduct from operator stake
    state.gateways[caller].vaults[id].balance = 0; // zero out this balance but do not delete the record
  } else {
    throw new ContractError("This stake cannot be decreased yet yet");
  }
  return { state };
};
