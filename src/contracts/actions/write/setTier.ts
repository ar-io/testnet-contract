import { PstAction, ArNSState, ContractResult } from "../../types/types";
declare const ContractError;

// Modifies the fees for purchasing ArNS names
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

  if (state.tiers === undefined) {
    // Do this if Tiers does not exist in the state of the contract.
    state = {
      ticker: state.ticker,
      name: state.name,
      owner: state.owner,
      evolve: state.evolve,
      records: state.records,
      balances: state.balances,
      approvedANTSourceCodeTxs: state.approvedANTSourceCodeTxs,
      foundation: state.foundation,
      settings: state.settings,
      vaults: state.vaults,
      tiers: {
        [tier]: {
          maxSubdomains: maxSubdomains,
          minTtlSeconds: minTtlSeconds,
        },
      },
      fees: state.fees,
    };
  } else {
    // Tiers already exists in the state of the contract
    state.tiers[tier] = { maxSubdomains, minTtlSeconds };
  }

  return { state };
};
