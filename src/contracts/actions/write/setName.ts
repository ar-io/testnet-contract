import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

// Sets the contract name
export const setName = async (
  state: IOState,
  { caller, input: { value } }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError('Caller cannot change tiers');
  }

  if (typeof value === 'string' && value.length <= 32) {
    state.name = value;
  } else {
    throw new ContractError('Name is invalid.');
  }

  return { state };
};
