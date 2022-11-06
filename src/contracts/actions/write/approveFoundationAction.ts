import { isArweaveAddress } from "@/contracts/utilities";
import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Signals an approval for a proposed foundation action
export const approveFoundationAction = async (
  state: ArNSState,
  { caller, input: { id } }: PstAction
): Promise<ContractResult> => {
  const foundation = state.foundation;

  if (!Number.isInteger(id)) {
    throw new ContractError('Invalid value for "id". Must be an integer.');
  }

  // The caller must be in the foundation, or else this transfer cannot be initiated
  if (!foundation.addresses.includes(caller)) {
    throw new ContractError(
      "Caller needs to be in the foundation wallet list."
    );
  }

  const action = foundation.actions[id];
  // the caller must not have already signed this transaction
  if (action.signed.includes(caller)) {
    throw new ContractError("Caller has already signed this action.");
  }

  //If this vote is active, but outside of the action period, then mark it as failed
  if (
    +SmartWeave.block.height >= action.start + foundation.actionPeriod &&
    action.status === "active"
  ) {
    state.foundation.actions[id].status = "failed"; // this vote has not completed within the action period
    return { state };
  }

  // If this vote is not active, then do nothing
  if (action.status !== "active") {
    throw new ContractError("This action is not active.");
  }

  // This is a valid active action, so increase signatures
  state.foundation.actions[id].totalSignatures += 1;
  state.foundation.actions[id].signed.push(caller);

  // If there are enough signatures to complete the transaction, then it is executed
  if (
    state.foundation.actions[id].totalSignatures >= foundation.minSignatures
  ) {
    if (state.foundation.actions[id].type === "transfer") {
      const recipient = state.foundation.actions[id].recipient;
      const qty = state.foundation.actions[id].qty;
      if (state.foundation.actions[id].lockLength) {
        // transfer tokens directly to a locked vault
        const start = +SmartWeave.block.height;
        const end = start + action.lockLength;
        if (recipient in state.vaults) {
          state.vaults[recipient].push({
            balance: qty,
            end,
            start,
          });
        } else {
          // unlocked transfer
          state.vaults[recipient] = [
            {
              balance: qty,
              end,
              start,
            },
          ];
        }
      } else {
        // unlocked transfer
        if (recipient in state.balances) {
          state.balances[recipient] += qty;
        } else {
          state.balances[recipient] = qty;
        }
      }
      // reduce quantity from the foundation balance
      state.foundation.balance -= state.foundation.actions[id].qty;
      state.foundation.actions[id].status = "passed";
    } else if (state.foundation.actions[id].type === "addAddress") {
      // Must be a valid Arweave public wallet address
      const target = isArweaveAddress(state.foundation.actions[id].target);
      if (!target || typeof target !== "string") {
        throw new ContractError("No valid target specified");
      }
      if (target in foundation.addresses) {
        throw new ContractError(
          "Target is already added as a Foundation address"
        );
      }
      // Add the new address
      state.foundation.addresses.push(target);
      state.foundation.actions[id].status = "passed";
    } else if (state.foundation.actions[id].type === "removeAddress") {
      // Must be a valid Arweave public wallet address
      const target = isArweaveAddress(state.foundation.actions[id].target);
      if (!target || typeof target !== "string") {
        throw new ContractError("No valid target specified");
      }

      if (!foundation.addresses.includes(target)) {
        throw new ContractError(
          "Target is not in the list of Foundation addresses"
        );
      }
      // Find the index of the existing foundation address and remove it
      const index = foundation.addresses.indexOf(target);
      state.foundation.addresses.splice(index, 1);
      state.foundation.actions[id].status = "passed";
    } else if (state.foundation.actions[id].type === "setMinSignatures") {
      const value = state.foundation.actions[id].value;
      if (
        !Number.isInteger(value) ||
        value <= 0 ||
        value > foundation.addresses.length
      ) {
        throw new ContractError(
          "Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation."
        );
      }
      state.foundation.minSignatures = +value;
      state.foundation.actions[id].status = "passed";
    } else if (state.foundation.actions[id].type === "setActionPeriod") {
      const value = state.foundation.actions[id].value;
      if (!Number.isInteger(value) || value <= 0) {
        throw new ContractError(
          "Invalid value for transfer period. Must be a positive integer"
        );
      }
      state.foundation.actionPeriod = +value;
      state.foundation.actions[id].status = "passed";
    } else {
      throw new ContractError("Invalid vote type.");
    }
  }
  return { state };
};
