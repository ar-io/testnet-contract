import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
  TransactionId,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateExtendVault } from '../../validations';
import { safeExtendVault } from '../../vaults';

// TODO: use top level class
export class ExtendVault {
  id: TransactionId;
  extendLength: BlockHeight;

  constructor(input: any) {
    if (!validateExtendVault(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateExtendVault, input, 'extendVault'),
      );
    }
    const { id, extendLength } = input;
    this.id = id;
    this.extendLength = new BlockHeight(extendLength);
  }
}

export const extendVault = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { vaults } = state;
  const { id, extendLength } = new ExtendVault(input);

  safeExtendVault({ vaults, address: caller, id, extendLength });

  return { state };
};
