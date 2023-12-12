import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
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

  state.distributions = {
    epochZeroBlockHeight: +SmartWeave.block.height,
    lastCompletedEpochStartHeight: 0,
    lastCompletedEpochEndHeight: 0,
    gateways: {},
    observers: {},
  };

  return { state };
};
