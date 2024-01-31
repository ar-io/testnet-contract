import {
  EPOCH_BLOCK_LENGTH,
  NON_CONTRACT_OWNER_MESSAGE,
} from '../../constants';
import { getEpochDataForHeight } from '../../observers';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
} from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  const {
    epochStartHeight,
    epochEndHeight,
    epochPeriod,
    epochDistributionHeight,
  } = getEpochDataForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(
      state.distributions.epochZeroStartHeight,
    ),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  state.distributions = {
    epochZeroStartHeight: state.distributions.epochZeroStartHeight,
    epochStartHeight: epochStartHeight.valueOf(),
    epochEndHeight: epochEndHeight.valueOf(),
    epochPeriod: epochPeriod.valueOf(),
    nextDistributionHeight: epochDistributionHeight.valueOf(),
  };

  return { state };
};
