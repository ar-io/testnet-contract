import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// After the time has passed for locked tokens, unlock them calling this function.
// Optionally pass a vault index to unlock a specific vault
export const unlock = async (
  state: ArNSState,
  { caller, input: { id } }: PstAction
): Promise<ContractResult> => {
  const vaults = state.vaults;
  const balances = state.balances;

  if (!(caller in vaults && vaults[caller].length)) {
    throw new ContractError("No vaults to unlock");
  }
  if (
    id &&
    (typeof id !== "number" || (id >= vaults[caller].length && id < 0))
  ) {
    throw new ContractError("Invalid vault index provided");
  }

  if (typeof id === "number" && id < vaults[caller].length && id >= 0) {
    const locked = vaults[caller][id];
    // Unlock a specific vault
    if (+SmartWeave.block.height >= locked.end) {
      if (caller in balances && typeof balances[caller] === "number") {
        state.balances[caller] += locked.balance;
      } else {
        state.balances[caller] = locked.balance;
      }
      state.vaults[caller].splice(id, 1);
    }
  } else {
    let i = vaults[caller].length;
    // Unlock all vaults
    while (i--) {
      const locked = vaults[caller][i];
      if (+SmartWeave.block.height >= locked.end) {
        if (caller in balances && typeof balances[caller] === "number") {
          state.balances[caller] += locked.balance;
        } else {
          state.balances[caller] = locked.balance;
        }
        state.vaults[caller].splice(i, 1);
      }
    }
  }
  return { state };
};
