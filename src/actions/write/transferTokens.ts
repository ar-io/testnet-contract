import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_TARGET_MESSAGE,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  getInvalidAjvMessage,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateTransferToken } from '../../validations.mjs';

declare const ContractError: any;

// TODO: use top level class
export class TransferToken {
  target: string;
  qty: number;

  constructor(input: any) {
    if (!validateTransferToken(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateTransferToken, input),
      );
    }
    const { target, qty } = input;
    this.target = target;
    this.qty = qty;
  }
}

export const transferTokens = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { balances } = state;
  const { target, qty } = new TransferToken(input);

  if (caller === target) {
    throw new ContractError(INVALID_TARGET_MESSAGE);
  }

  if (!walletHasSufficientBalance(balances, caller, qty)) {
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
