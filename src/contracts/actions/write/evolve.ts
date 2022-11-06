import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;

// Updates this contract to new source code
export const evolve = async (
  state: ArNSState,
  { caller, input: { value } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError("Caller cannot evolve the contract");
  }

  state.evolve = value.toString();

  return { state };
};
