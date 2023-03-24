import {
  DEFAULT_INSUFFICIENT_FUNDS_MESSAGE,
  DEFAULT_INVALID_TARGET_MESSAGE,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

export const transferTokens = async (
  state: IOState,
  { caller, input: { target, qty } }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  if (!Number.isInteger(qty)) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
  }

  if (!target) {
    throw new ContractError('No target specified');
  }

  if (qty <= 0 || caller === target) {
    throw new ContractError(DEFAULT_INVALID_TARGET_MESSAGE);
  }

  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (balances[caller] < qty) {
    throw new ContractError(DEFAULT_INSUFFICIENT_FUNDS_MESSAGE);
  }

  // deduct from caller, add to target
  if (target in balances) {
    balances[target] += qty;
  } else {
    balances[target] = qty;
  }

  balances[caller] -= qty;

  // set balances
  state.balances = balances;

  return { state };
};
