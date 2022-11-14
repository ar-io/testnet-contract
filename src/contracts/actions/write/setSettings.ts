import { PstAction, ArNSState, ContractResult } from "../../types/types";
declare const ContractError;

// Modifies the fees for purchasing ArNS names
export const setSettings = async (
  state: ArNSState,
  { caller, input: { settings } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError("Caller cannot change settings");
  }

  state.settings = settings;

  return { state };
};
