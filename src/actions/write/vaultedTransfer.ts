import { safeVaultedTransfer } from '../../transfer';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  IOToken,
  PstAction,
  mIOToken,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateTransferTokensLocked } from '../../validations';

// TODO: use top level class
export class TransferTokensLocked {
  target: string;
  qty: mIOToken;
  lockLength: BlockHeight;

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
    this.qty = new IOToken(qty).toMIO();
    this.lockLength = new BlockHeight(lockLength);
  }
}

export const vaultedTransfer = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, vaults } = state;
  const { target, qty, lockLength } = new TransferTokensLocked(input);

  safeVaultedTransfer({
    balances,
    vaults,
    fromAddress: caller,
    toAddress: target,
    qty,
    lockLength,
    id: SmartWeave.transaction.id,
    startHeight: new BlockHeight(SmartWeave.block.height),
  });

  return { state };
};
