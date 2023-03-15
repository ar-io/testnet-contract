import { DEFAULT_NON_CONTRACT_OWNER_MESSAGE } from '@/constants.js';
import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

export const removeRecord = async (
  state: IOState,
  { caller, input: { name } }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;
  const records = state.records;

  // Check if the user has enough tokens to purchase the name
  if (caller !== owner) {
    throw new ContractError(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
  }

  // enforce lower case names
  name = name.toLowerCase();

  // Check if the requested name already exists, if not reduce balance and add it
  if (name in records) {
    delete records[name];
  } else {
    throw new ContractError(`Name does not exist in the ArNS!`);
  }

  // update the records
  state.records = records;

  return { state };
};
