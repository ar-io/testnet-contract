import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
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
  const epochEndHeight = epochStartHeight + EPOCH_BLOCK_LENGTH - 1;
  const epochDistributionHeight = epochEndHeight + EPOCH_DISTRIBUTION_DELAY;
  state.distributions = {
    epochZeroStartHeight: epochStartHeight,
    epochStartHeight,
    epochEndHeight,
    epochDistributionHeight,
    gateways: {},
    observers: {},
  };

  state.observations = {};

  return { state };
};
