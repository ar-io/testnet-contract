import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Updates this contract to new source code
export const evolve = async (
  state: IOState,
  { caller, input: { value } }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  state.evolve = value.toString();

  return { state };
};
