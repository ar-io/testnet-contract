import { PstAction, ArNSState, ContractResult } from "../../types/types";
import { TX_ID_LENGTH } from "@/constants";
declare const ContractError;

// Modifies the fees for purchasing ArNS names
export const removeANTSourceCodeTx = async (
  state: ArNSState,
  { caller, input: { contractTxId } }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;
  const approvedANTSourceCodeTxs = state.approvedANTSourceCodeTxs;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError("Caller cannot add ANT Source Code Transaction IDs");
  }

  // check if it is a valid arweave transaction id for the smartweave contract
  const txIdPattern = new RegExp("^[a-zA-Z0-9_-]{43}$");
  const txIdres = txIdPattern.test(contractTxId);
  if (
    typeof contractTxId !== "string" ||
    contractTxId.length !== TX_ID_LENGTH ||
    !txIdres
  ) {
    throw new ContractError("Invalid ANT Source Code Transaction ID");
  }

  if (approvedANTSourceCodeTxs.indexOf(contractTxId) > -1) {
    state.approvedANTSourceCodeTxs.splice(approvedANTSourceCodeTxs.indexOf(contractTxId));
  } else {
    throw new ContractError("This ANT Source Code Transaction ID not in the list.");
  }

  return { state };
};
