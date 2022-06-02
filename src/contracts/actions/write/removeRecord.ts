import { PstAction, GNSRState, ContractResult } from "../../types/types";

declare const ContractError;

export const removeRecord = async (
  state: GNSRState,
  { caller, input: { name } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;
  const records = state.records;

  // Check if the user has enough tokens to purchase the name
  if (caller !== owner) {
    throw new ContractError(`Caller is not the owner of the GNSR!`);
  }

  // Check if the requested name already exists, if not reduce balance and add it
  if (name in records) {
    delete records[name];
  } else {
    throw new ContractError(`Name does not exist in the GNSR!`);
  }

  return { state };
};