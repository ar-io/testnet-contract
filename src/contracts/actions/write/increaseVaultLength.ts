import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Increases the unlock time for the vault of a community staker
export const increaseVaultLength = async (
  state: ArNSState,
  { caller, input: { id, lockLength } }: PstAction
): Promise<ContractResult> => {
  const settings = state.settings;
  const vaults = state.vaults;

  if (
    !Number.isInteger(lockLength) ||
    lockLength < settings["lockMinLength"] ||
    lockLength > settings["lockMaxLength"]
  ) {
    throw new ContractError(
      `lockLength is out of range. lockLength must be between ${settings["lockMinLength"]} - ${settings["lockMaxLength"]}.`
    );
  }

  if (!Number.isInteger(id)) {
    throw new ContractError("Invalid ID.  Must be an integer.");
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

  state.vaults[caller][id].end = +SmartWeave.block.height + lockLength;

  return { state };
};
