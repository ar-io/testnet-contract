import { resetProtocolBalance } from 'src/utilities';

import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // convert all gateway stakes and delegates to mIO
  const { balances } = resetProtocolBalance(state);

  state.balances = balances;

  return { state };
};
