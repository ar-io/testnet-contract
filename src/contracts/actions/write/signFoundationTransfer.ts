import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const vote = async (
  state: ArNSState,
  { caller, input: { id } }: PstAction
): Promise<ContractResult> => {
  const foundation = state.foundation;
  const settings = state.settings;

  if (!Number.isInteger(id)) {
    throw new ContractError('Invalid value for "id". Must be an integer.');
  }

  // The caller must be in the foundation, or else this transfer cannot be initiated
  if (!(foundation.addresses.includes(caller))) {
    throw new ContractError("Caller needs to be in the foundation wallet list.");
  }

  const transfer = foundation.transfers[id]
  if (transfer.signed.includes(caller)) {
    throw new ContractError("Caller has already signed this transfer.");
  }

  if (+SmartWeave.block.height >= transfer.start + +settings["voteLength"] || transfer.status !== "active") {
    throw new ContractError("Transfer has already concluded or is not active.");
  }

  state.foundation.transfers[id].totalSignatures += 1;
  state.foundation.transfers[id].signed.push(caller);

  // Does this transfer have enough signatures to complete?
  if (state.foundation.transfers[id].totalSignatures >= foundation.minSignatures) {
    const recipient = state.foundation.transfers[id].recipient
    const qty = state.foundation.transfers[id].qty;
    // if there is a lock, then transfer lock
    if (state.foundation.transfers[id].lockLength) {
      // transfer lock
    } else { // unlocked transfer
      if (recipient in state.balances) {
        state.balances[recipient] += qty;
      } else {
        state.balances[recipient] = qty;
      }
    }
    // reduce quantity from the foundation balance
    state.foundation.balance -= state.foundation.transfers[id].qty
  }
  return { state };
};
