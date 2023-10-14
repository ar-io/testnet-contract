import {
  CALLER_NOT_VALID_OBSERVER_MESSAGE,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { getEpochStart, getPrescribedObservers } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

export const isPrescribedObserver = async (
  state: IOState,
  { input: { target, height } }: PstAction,
): Promise<ContractResult> => {
  const { settings, gateways } = state;
  const gateway = gateways[target];
  const currentEpochStartHeight = getEpochStart({
    startHeight: DEFAULT_START_HEIGHT,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: height,
  });
  if (!gateway) {
    return { result: false };
  } else if (gateway.start > currentEpochStartHeight) {
    return { result: false };
  }

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

  if (!(target in prescribedObservers)) {
    // The gateway with the specified address is not found in the prescribedObservers list
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  return { result: true };
};
