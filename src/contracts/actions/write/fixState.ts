import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;

// Sets an existing record and if one does not exist, it cre
export const fixState = async (
  state: ArNSState,
  { caller, input: { value } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError("Caller cannot evolve the contract");
  }

  if (state.tiers === undefined) {
    // Do this if Tiers does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        tiers: {},
      },
    };
  }

  if (state.foundation === undefined) {
    // Do this if foundation does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        foundation: {},
      },
    };
  }

  return { state };
};
