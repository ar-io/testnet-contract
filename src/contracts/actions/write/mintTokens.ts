import { PstAction, GNSRState, ContractResult } from "../../types/types";

declare const ContractError;

export const mintTokens = async (
  state: GNSRState,
  { caller, input: { qty } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const owner = state.owner;

  if (qty <= 0) {
    throw new ContractError("Invalid token mint");
  }

  if (!Number.isInteger(qty)) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
  }

  if (caller !== owner) {
    throw new ContractError("Caller cannot mint tokes");
  }

  balances[caller] ? (balances[caller] += qty) : (balances[caller] = qty);
  return { state };
};
