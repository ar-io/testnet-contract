import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const increaseVaultBalance = async (
  state: ArNSState,
  { caller, input: { id, qty } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const vaults = state.vaults;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }

  if (!Number.isInteger(id)) {
    throw new ContractError("Invalid ID.  Must be an integer.");
  }

  const balance = balances[caller];
  if (isNaN(balance) || balance < qty) {
    throw new ContractError("Not enough balance.");
  }

  if (caller in vaults) {
    if (!vaults[caller][id]) {
      throw new ContractError("Invalid vault ID.");
    }
  } else {
    throw new ContractError("Caller does not have a vault.");
  }

  if (+SmartWeave.block.height >= vaults[caller][id].end) {
    throw new ContractError("This vault has ended.");
  }

  state.balances[caller] -= qty;
  state.vaults[caller][id].balance += qty;

  return { state };
};
