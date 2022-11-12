import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Delegates an amount of tokens to a joined gateway
export const delegateStake = async (
  state: ArNSState,
  { caller, input: { qty, target } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const gateways = state.gateways;
  const settings = state.settings;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }

  if (!target) {
    throw new ContractError("No target specified");
  }

  if (qty < settings.minDelegatedStakeAmount) {
    throw new ContractError("Quantity is not about the minimum delegated stake")
  }

  if (!balances[caller]) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to stake ${qty} token(s)!`
    );
  }

  if (target in gateways) {
    if (caller in state.gateways[target].delegates) {
      // this caller is already delegated, so increase existing stake by adding a new vault
      state.balances[caller] -= qty;
      state.gateways[target].delegatedStake += qty;
      state.gateways[target].delegates[caller].push({
        balance: qty,
        start: +SmartWeave.block.height,
        end: 0,
      });
    } else {
      // create a new stake
      state.balances[caller] -= qty;
      state.gateways[target].delegatedStake += qty;
      state.gateways[target].delegates[caller] = [
        {
          balance: qty,
          start: +SmartWeave.block.height,
          end: 0,
        },
      ];
    }
  } else {
    throw new ContractError("This Gateway's wallet is not registered");
  }
  return { state };
};