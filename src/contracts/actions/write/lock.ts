import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const lock = async (
  state: ArNSState,
  { caller, input: { qty, lockLength } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const settings = state.settings;
  const vaults = state.vaults;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }
  if (
    !Number.isInteger(lockLength) ||
    lockLength < settings["lockMinLength"] ||
    lockLength > settings["lockMaxLength"]
  ) {
    throw new ContractError(
      `lockLength is out of range. lockLength must be between ${settings["lockMinLength"]} - ${settings["lockMaxLength"]}.`
    );
  }
  const balance = balances[caller];
  if (isNaN(balance) || balance < qty) {
    throw new ContractError("Not enough balance.");
  }

  state.balances[caller] -= qty;
  const start = +SmartWeave.block.height;
  const end = start + lockLength;
  if (caller in vaults) {
    state.vaults[caller].push({
      balance: qty,
      end,
      start,
    });
  } else {
    state.vaults[caller] = [
      {
        balance: qty,
        end,
        start,
      },
    ];
  }
  return { state };
};
