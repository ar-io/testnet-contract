import { ContractResult, IOState, PstAction } from 'src/types';

import {
  CALLER_NOT_VALID_OBSERVER_MESSAGE,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
} from '../../constants';

declare const ContractError;

export function getEpochEnd(height: number): number {
  return (
    DEFAULT_START_HEIGHT +
    DEFAULT_EPOCH_BLOCK_LENGTH *
      (Math.floor(
        (height - DEFAULT_START_HEIGHT) / DEFAULT_EPOCH_BLOCK_LENGTH,
      ) +
        1) -
    1
  );
}

export function getEpochStart(height: number): number {
  return getEpochEnd(height) + 1 - DEFAULT_EPOCH_BLOCK_LENGTH;
}

export const isPrescribedObserver = async (
  state: IOState,
  { input: { target, height } }: PstAction,
): Promise<ContractResult> => {
  const { settings, gateways } = state;
  const gateway = gateways[target];
  const currentEpochStartHeight = getEpochStart(height);
  if (!gateway) {
    return { result: false };
  } else if (gateway.start > currentEpochStartHeight) {
    return { result: false };
  }

  const eligibleObservers = {};
  for (const address in gateways) {
    const gateway = gateways[address];

    // Check the conditions
    const isWithinStartRange = gateway.start <= currentEpochStartHeight;
    const isWithinEndRange =
      gateway.end === 0 ||
      gateway.end - settings.registry.gatewayLeaveLength <
        currentEpochStartHeight;

    // Keep the gateway if it meets the conditions
    if (isWithinStartRange && isWithinEndRange) {
      eligibleObservers[address] = gateway;
    }
  }

  if (!(target in eligibleObservers)) {
    // The gateway with the specified address is not found in the eligibleObservers list
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  return { result: true };
};
