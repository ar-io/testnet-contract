import { PstAction, ArNSState, ContractResult } from "../../types/types";
declare const ContractError;

// Modifies an existing tier or creates a new one.
export const setTier = async (
  state: ArNSState,
  { caller, input: { tier, maxSubdomains, minTtlSeconds } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError("Caller cannot change tiers");
  }

  if (
    !Number.isInteger(maxSubdomains) ||
    !Number.isInteger(tier) ||
    !Number.isInteger(minTtlSeconds)
  ) {
    throw new ContractError("Invalid tier configuration");
  }

  state.tiers[tier] = { maxSubdomains, minTtlSeconds };

  return { state };
};
