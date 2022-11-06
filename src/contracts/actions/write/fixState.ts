import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;

// Temporary method to fix a broken contract state
export const fixState = async (
  state: ArNSState,
  { caller, input: {} }: PstAction
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

  if (state.vaults === undefined) {
    // Do this if foundation does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        vaults: {},
      },
    };
  }

  if (state.foundation === undefined) {
    // Do this if foundation does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        foundation: {
          balance: 0,
          actionPeriod: 720,
          minSignatures: 2,
          addresses: ["QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ", "31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8", "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g"],
          actions: []
        },
      },
    };
  } 

  if (state.settings === undefined) {
      // Do this if settings does not exist in the state of the contract.
      state = {
        ...state,
        ...{
          settings: {
            lockMinLength: 5,
            lockMaxLength: 10000
          },
        },
      };
  }  

  return { state };
};
