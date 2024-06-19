import { NON_CONTRACT_OWNER_MESSAGE, TOTAL_IO_SUPPLY } from '../../constants';
import {
  ContractWriteResult,
  IOState,
  PstAction,
  WalletAddress,
} from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  const updatedBalances = Object.keys(state.balances).reduce(
    (acc: Record<WalletAddress, number>, address) => {
      // convert the base fee to mIO
      acc[address] = 0;
      return acc;
    },
    {},
  );

  updatedBalances[owner] = TOTAL_IO_SUPPLY.valueOf();
  state.balances = updatedBalances;
  return { state };
};
