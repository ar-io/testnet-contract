import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

export const getBalance = async (
  state: IOState,
  { input: { target } }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;

  if (typeof target !== 'string') {
    throw new ContractError('Must specify target to get balance for');
  }

  if (typeof balances[target] !== 'number') {
    throw new ContractError('Cannot get balance, target does not exist');
  }

  return {
    result: {
      target,
      balance: balances[target],
    },
  };
};
