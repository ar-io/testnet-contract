import { ContractWriteResult, IOState, PstAction } from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateCreateVault } from '../../validations';
import { safeCreateVault } from '../../vaults';

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
  // transfer tokens into the caller's vault
  safeCreateVault({
    balances,
    vaults,
    address: caller,
    qty,
    lockLength,
  });

  return { state };
};
