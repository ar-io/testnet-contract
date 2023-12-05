import {
  ContractWriteResult,
  IOState,
  PositiveFiniteInteger,
  PstAction,
  TransactionId,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateIncreaseVault } from '../../validations';
import { safeIncreaseVault } from '../../vaults';

// TODO: use top level class
export class IncreaseVault {
  id: TransactionId;
  qty: PositiveFiniteInteger; // TODO: change to IO Token

  constructor(input: any) {
    if (!validateIncreaseVault(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateIncreaseVault, input, 'increaseVault'),
      );
    }
    const { id, qty } = input;
    this.id = id;
    this.qty = new PositiveFiniteInteger(qty);
  }
}

export const increaseVault = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, vaults } = state;
  const { id, qty } = new IncreaseVault(input);

  safeIncreaseVault({
    balances,
    vaults,
    address: caller,
    id,
    qty,
  });

  return { state };
};
