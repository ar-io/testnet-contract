import { ContractWriteResult, IOState, PstAction } from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateExtendVault } from '../../validations';
import { safeExtendVault } from '../../vaults';

// TODO: use top level class
export class ExtendVault {
  index: number;
  lockLength: number;

  constructor(input: any) {
    if (!validateExtendVault(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateExtendVault, input, 'extendVault'),
      );
    }
    const { index, lockLength } = input;
    this.index = index;
    this.lockLength = lockLength;
  }
}

export const extendVault = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { vaults } = state;
  const { index, lockLength } = new ExtendVault(input);

  safeExtendVault({ vaults, address: caller, index, lockLength });

  return { state };
};
