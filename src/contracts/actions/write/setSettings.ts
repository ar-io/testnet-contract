import { PstAction, IOState, ContractResult } from "../../types/types";
declare const ContractError;

// Modifies the fees for purchasing ArNS names
export const setSettings = async (
  state: IOState,
  { caller, input: { settings } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError("Caller cannot change settings");
  }

  // need to validate the settings being passed

  state.settings = settings;

  return { state };
};
