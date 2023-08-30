import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // TODO: this is a helper function to backfill state. Update this code and invoke the method with the new source contract to use.

  return { state };
};
