import { ContractReadResult, IOState, PstAction, mIOToken } from '../../types';

export const balance = async (
  state: IOState,
  { input: { target } }: PstAction,
): Promise<ContractReadResult> => {
  const balances = state.balances;

  if (typeof target !== 'string') {
    throw new ContractError('Must specify target to get balance for');
  }

  if (typeof balances[target] !== 'number') {
    throw new ContractError('Cannot get balance, target does not exist');
  }

  // TODO: we could return IO here
  const balance = new mIOToken(balances[target]);

  return {
    result: {
      target,
      balance: balance.valueOf(),
    },
  };
};
