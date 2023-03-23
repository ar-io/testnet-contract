import {
  DEFAULT_INVALID_QTY_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
} from '@/constants.js';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

export const mintTokens = async (
  state: IOState,
  { caller, input: { qty } }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const owner = state.owner;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError(DEFAULT_INVALID_QTY_MESSAGE);
  }

  if (caller !== owner) {
    throw new ContractError(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
  }

  balances[caller] ? (balances[caller] += qty) : (balances[caller] = qty);
  return { state };
};
