import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  NON_CONTRACT_OWNER_MESSAGE,
} from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  const epochStartHeight = +SmartWeave.block.height;
  state.distributions = {
    epochZeroStartHeight: epochStartHeight,
    epochStartHeight: epochStartHeight,
    epochEndHeight: epochStartHeight + DEFAULT_EPOCH_BLOCK_LENGTH - 1,
    gateways: {},
    observers: {},
  };

  return { state };
};
