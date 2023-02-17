import { ArNSState, ContractResult, PstAction } from '../../types/types';

declare const ContractError;

// Sets an existing record and if one does not exist, it cre
export const evolve = async (
  state: ArNSState,
  { caller, input: { value } }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError('Caller cannot evolve the contract');
  }

  state.evolve = value;

  return { state };
};
