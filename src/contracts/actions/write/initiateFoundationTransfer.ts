import { isArweaveAddress } from "@/contracts/utilities";
import {
  PstAction,
  ArNSState,
  ContractResult,
  FoundationTransferInterface,
} from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const initiateFoundationTransfer = async (
  state: ArNSState,
  {
    caller,
    input: { note, recipient, qty, lockLength },
  }: PstAction
): Promise<ContractResult> => {
  const foundation = state.foundation;
  const settings = state.settings;

  if (typeof note !== "string") {
    throw new ContractError("Note format not recognized.");
  }

  // The caller must be in the foundation, or else this transfer cannot be initiated
  if (!(foundation.addresses.includes(caller))) {
    throw new ContractError("Caller needs to be in the foundation wallet list.");
  }

  // Must be a valid Arweave public wallet address
  recipient = isArweaveAddress(recipient);
  if (!recipient || typeof recipient !== "string") {
    throw new ContractError("No recipient specified");
  }

  // Must be a valid quantity
  if (!Number.isInteger(qty) || qty <= 0 || qty > foundation.balance ) {
    throw new ContractError(
      'Invalid value for "qty". Must be a positive integer and must not be greater than the total balance available.'
    );
  }

  if (lockLength) {
    if (
      !Number.isInteger(lockLength) ||
      lockLength < settings["lockMinLength"] ||
      lockLength > settings["lockMaxLength"]
    ) {
      throw new ContractError(
        `lockLength is out of range. lockLength must be between ${settings["lockMinLength"]} - ${settings["lockMaxLength"]}.`
      );
    }
  }

  // The vote interface contains the details about each vote type and is further setup below
  let foundationTransfer: FoundationTransferInterface = {
    status: "active",
    id: foundation.transfers.length, // Set the ID based on the amount of transfers that have been submitted.
    note,
    totalSignatures: 0, 
    signed: [],
    recipient,
    qty,
    lockLength,
    start: +SmartWeave.block.height,
  }

  state.foundation.transfers.push(foundationTransfer);
  return { state };
};
