import {
  EPOCH_BLOCK_LENGTH,
  GATEWAY_REGISTRY_SETTINGS,
  NON_CONTRACT_OWNER_MESSAGE,
} from '../../constants';
import {
  getEpochDataForHeight,
  getPrescribedObserversForEpoch,
} from '../../observers';
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

  const { epochStartHeight, epochEndHeight } = getEpochDataForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(
      state.distributions.epochZeroStartHeight,
    ),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways: state.gateways,
    distributions: state.distributions,
    epochStartHeight,
    epochEndHeight,
    minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
  });

  state.prescribedObservers = {
    [epochStartHeight.valueOf()]: prescribedObservers,
  };

  return { state };
};
