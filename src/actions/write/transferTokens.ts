import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_TARGET_MESSAGE,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

export const transferTokens = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;

  // todo: do object parsing and validation on
  const { target, qty } = input as any;

  if (!Number.isInteger(qty)) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
  }

  if (!target) {
    throw new ContractError('No target specified');
  }

  if (qty <= 0 || caller === target) {
    throw new ContractError(INVALID_TARGET_MESSAGE);
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
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
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
