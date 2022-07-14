import { PstAction, ArNSState, ContractResult } from "../../types/types";
declare const ContractError;

// Modifies the fees for purchasing ArNS names
export const setTier = async (
  state: ArNSState,
  { caller, input: { tier, maxSubdomains } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError("Caller cannot change tiers");
  }

  if (!Number.isInteger(maxSubdomains) || !Number.isInteger(tier)) {
    throw new ContractError("Invalid tier configuration");
  }

  state.tiers[tier] = { maxSubdomains };

  return { state };
};
