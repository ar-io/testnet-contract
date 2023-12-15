import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  NON_CONTRACT_OWNER_MESSAGE,
  TALLY_PERIOD_BLOCKS,
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

  const epochEndHeight =
    +SmartWeave.block.height + DEFAULT_EPOCH_BLOCK_LENGTH - 1;
  const nextDistributionHeight = epochEndHeight + TALLY_PERIOD_BLOCKS;

  state.distributions = {
    epochZeroStartHeight: +SmartWeave.block.height,
    epochStartHeight: +SmartWeave.block.height,
    epochEndHeight,
    nextDistributionHeight,
    gateways: {},
    observers: {},
  };

  return { state };
};
