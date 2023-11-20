import { NON_CONTRACT_OWNER_MESSAGE, TOTAL_IO_SUPPLY } from '../../constants';
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

  const totalBalances = Object.values(state.balances).reduce(
    (total, current) => total + current,
    0,
  );

  const diff = TOTAL_IO_SUPPLY - totalBalances;

  if (diff > 0) {
    state.balances[SmartWeave.contract.id] += diff;
  }

  return { state };
};
