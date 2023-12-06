import { safeTransferLocked } from '../../transfer';
import { ContractWriteResult, IOState, PstAction } from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateTransferTokensLocked } from '../../validations';

// TODO: use top level class
export class TransferTokensLocked {
  target: string;
  qty: number;
  lockLength: number;

  constructor(input: any) {
    if (!validateTransferTokensLocked(input)) {
      throw new ContractError(
        getInvalidAjvMessage(
          validateTransferTokensLocked,
          input,
          'transferTokensLocked',
        ),
      );
    }
    const { target, qty, lockLength } = input;
    this.target = target;
    this.qty = qty;
    this.lockLength = lockLength;
  }
}

export const transferTokensLocked = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, vaults } = state;
  const { target, qty, lockLength } = new TransferTokensLocked(input);

  safeTransferLocked({
    balances,
    vaults,
    fromAddr: caller,
    toAddr: target,
    qty,
    lockLength,
  });

  return { state };
};
