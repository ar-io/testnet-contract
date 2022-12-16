import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Locks tokens into a new gateway operator vault
export const increaseOperatorStake = async (
  state: IOState,
  { caller, input: { qty } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const gateways = state.gateways;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }

  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to stake ${qty} token(s)!`
    );
  }

  if (caller in gateways) {
    state.balances[caller] -= qty;
    state.gateways[caller].operatorStake += qty;
    state.gateways[caller].vaults.push({
      balance: qty,
      start: +SmartWeave.block.height,
      end: 0,
    });
  } else {
    throw new ContractError("This Gateway's wallet is not registered");
  }
  return { state };
};
