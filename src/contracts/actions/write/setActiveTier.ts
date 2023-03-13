import { ALLOWED_ACTIVE_TIERS } from '@/constants.js';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

// Modifies an existing tier or creates a new one.
export const setActiveTier = async (
  state: IOState,
  { caller, input: { tierNumber, tierId } }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError('Caller cannot change tiers');
  }

  if (
    !Number.isInteger(tierNumber) ||
    !ALLOWED_ACTIVE_TIERS.includes(tierNumber)
  ) {
    throw new ContractError(
      `Invalid tier number provided. Allowed tier numbers: ${ALLOWED_ACTIVE_TIERS}`,
    );
  }

  state.tiers[tier] = { maxUndernames, minTtlSeconds };

  return { state };
};
