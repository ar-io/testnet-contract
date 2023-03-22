import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_INVALID_TIER_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
} from '@/constants.js';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

// Modifies an existing tier or creates a new one.
export const setActiveTier = async (
  state: IOState,
  { caller, input: { tierNumber, tierId } }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;
  const history = state.tiers.history;
  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
  }

  if (
    !Number.isInteger(tierNumber) &&
    ALLOWED_ACTIVE_TIERS.includes[tierNumber]
  ) {
    throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
  }

  // the tier must exist in the history before it can be set as a current tier
  const existingTier = history.find((tier) => tier.id === tierId);

  if (!existingTier) {
    throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
  }

  state.tiers.current[tierNumber] = tierId;

  return { state };
};
