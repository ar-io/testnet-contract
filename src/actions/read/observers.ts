import { EPOCH_BLOCK_LENGTH, GATEWAY_REGISTRY_SETTINGS } from '../../constants';
import {
  getEpochDataForHeight,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  BlockHeight,
  ContractReadResult,
  EpochDistributionData,
  IOState,
} from '../../types';

export const getPrescribedObservers = async (
  state: IOState,
): Promise<ContractReadResult> => {
  const { gateways, distributions } = state;

  if (+SmartWeave.block.height < distributions.epochZeroStartHeight) {
    return { result: [] };
  }

  const { epochStartHeight, epochEndHeight } = getEpochDataForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    epochStartHeight,
    epochEndHeight,
    distributions,
    minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
  });

  return { result: prescribedObservers };
};

export async function getEpoch(
  state: IOState,
  { input: { height } }: { input: { height: number } },
): Promise<{
  result: Omit<EpochDistributionData, 'nextDistributionHeight'> & {
    epochBlockLength: number;
    epochDistributionHeight: number;
  };
}> {
  const { distributions } = state;

  const requestedHeight = height || +SmartWeave.block.height;

  if (isNaN(requestedHeight) || requestedHeight <= 0) {
    throw new ContractError('Invalid height. Must be a number greater than 0.');
  }

  const {
    epochStartHeight,
    epochEndHeight,
    epochDistributionHeight,
    epochPeriod,
  } = getEpochDataForHeight({
    currentBlockHeight: new BlockHeight(requestedHeight),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  return {
    result: {
      epochStartHeight: epochStartHeight.valueOf(),
      epochEndHeight: epochEndHeight.valueOf(),
      epochZeroStartHeight: distributions.epochZeroStartHeight,
      epochDistributionHeight: epochDistributionHeight.valueOf(),
      epochPeriod: epochPeriod.valueOf(),
      epochBlockLength: EPOCH_BLOCK_LENGTH,
    },
  };
}
