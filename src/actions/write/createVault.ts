import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
  mIOToken,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateCreateVault } from '../../validations';
import { safeCreateVault } from '../../vaults';

// TODO: use top level class
export class CreateVault {
  qty: mIOToken;
  lockLength: BlockHeight;

  constructor(input: any) {
    if (!validateCreateVault(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateCreateVault, input, 'createVault'),
      );
    }
    const { qty, lockLength } = input;
    this.qty = new mIOToken(qty); // to avoid any issue with user provided decimals
    this.lockLength = new BlockHeight(lockLength);
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
    id: SmartWeave.transaction.id,
    startHeight: new BlockHeight(SmartWeave.block.height),
  });

  return { state };
};
