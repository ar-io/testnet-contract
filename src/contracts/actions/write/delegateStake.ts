import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const delegateStake = async (
  state: ArNSState,
  {
    caller,
    input: { qty, target },
  }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const gateways = state.gateways;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }

  const balance = balances[caller];
  if (isNaN(balance) || balance < qty) {
    throw new ContractError("Not enough balance.");
  }

  if (target in gateways) {
    if (caller in state.gateways[target].delegates) {
      // this caller is already delegated, so increase existing stake by adding a new vault
      state.balances[caller] -= qty;
      state.gateways[target].delegates[caller].push({
        balance: qty,
        start: +SmartWeave.block.height,
        end: 0,
      });
    } else {
      state.balances[caller] -= qty;
      state.gateways[target].delegates[caller] = [{
        balance: qty,
        start: +SmartWeave.block.height,
        end: 0,
      }];
    }
  } else {
    throw new ContractError("This Gateway's wallet is not registered");
  }
  return { state };
};
