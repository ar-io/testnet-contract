import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;

export const balance = async (
  state: ArNSState,
  { input: { target } }: PstAction
): Promise<ContractResult> => {
  const ticker = state.ticker;
  const balances = state.balances;

  if (typeof target !== "string") {
    throw new ContractError("Must specify target to get balance for");
  }

  if (typeof balances[target] !== "number") {
    throw new ContractError("Cannot get balance, target does not exist");
  }

  return {
    result: {
      target,
      balance: balances[target],
    },
  };
};
