import { INSUFFICIENT_FUNDS_MESSAGE } from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';
import {
  getInvalidAjvMessage,
  safeCreateVault,
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateCreateVault } from '../../validations';

// TODO: use top level class
export class CreateVault {
  qty: number;
  lockLength: number;

  constructor(input: any) {
    if (!validateCreateVault(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateCreateVault, input, 'createVault'),
      );
    }
    const { qty, lockLength } = input;
    this.qty = qty;
    this.lockLength = lockLength;
  }
}

export const createVault = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, vaults } = state;
  const { qty, lockLength } = new CreateVault(input);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError(
      'Invalid value for "qty". Must be an integer greater than 0',
    );
  }

  if (balances[caller] === null || isNaN(balances[caller])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, caller, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  safeCreateVault(vaults, caller, qty, lockLength);
  unsafeDecrementBalance(balances, caller, qty);

  return { state };
};
