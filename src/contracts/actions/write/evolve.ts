import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;

// Updates this contract to new source code
export const evolve = async (
  state: IOState,
  { caller, input: { value, version } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError("Caller cannot evolve the contract");
  }

  if (version) {
    if (typeof version === "string" && version.length <= 32) {
      state.version = version;
    } else {
      throw new ContractError("Invalid version provided");
    }
  }

  state.evolve = value.toString();

  return { state };
};
