import { isArweaveAddress } from "@/contracts/utilities";
import {
  PstAction,
  ArNSState,
  ContractResult,
  FoundationActionInterface,
} from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const initiateFoundationAction = async (
  state: ArNSState,
  {
    caller,
    input: { type, note, recipient, qty, lockLength, value, target },
  }: PstAction
): Promise<ContractResult> => {
  const foundation = state.foundation;
  const settings = state.settings;
  let foundationAction: FoundationActionInterface;

  // The caller must be in the foundation, or else this transfer cannot be initiated
  if (!foundation.addresses.includes(caller)) {
    throw new ContractError(
      "Caller needs to be in the foundation wallet list."
    );
  }

  if (typeof note !== "string") {
    throw new ContractError("Note format not recognized.");
  }

  if (typeof type !== "string") {
    throw new ContractError("Type format not recognized.");
  }

  if (type === "transfer") {
    // Must be a valid Arweave public wallet address
    recipient = isArweaveAddress(recipient);
    if (!recipient || typeof recipient !== "string") {
      throw new ContractError("No recipient specified");
    }

    // Must be a valid quantity
    if (!Number.isInteger(qty) || qty <= 0 || qty > foundation.balance) {
      throw new ContractError(
        'Invalid value for "qty". Must be a positive integer and must not be greater than the total balance available.'
      );
    }

    // if a locklength is provided, then the tokens are sent to a vault
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
  } else if (type === "addAddress") {
    // Must be a valid Arweave public wallet address
    target = isArweaveAddress(target);
    if (!target || typeof target !== "string") {
      throw new ContractError("No valid target specified");
    }
    if (target in foundation.addresses) {
      throw new ContractError(
        "Target is already added as a Foundation address"
      );
    }
  } else if (type === "removeAddress") {
    // Must be a valid Arweave public wallet address
    target = isArweaveAddress(target);
    if (!target || typeof target !== "string") {
      throw new ContractError("No valid target specified");
    }
    if (!(target in foundation.addresses)) {
      throw new ContractError(
        "Target is not int he list of Foundation addresses"
      );
    }
  } else if (type === "setMinSignatures") {
    if (
      !Number.isInteger(value) ||
      value <= 0 ||
      value > foundation.addresses.length
    ) {
      throw new ContractError(
        "Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation."
      );
    }
  } else if (type === "setTransferPeriod") {
    if (!Number.isInteger(value) || value <= 0) {
      throw new ContractError(
        "Invalid value for transfer period. Must be a positive integer"
      );
    }
  } else {
    throw new ContractError("Invalid vote type.");
  }

  // The vote interface contains the details about each vote type and is further setup below
  foundationAction = {
    type,
    status: "active",
    id: foundation.actions.length, // Set the ID based on the amount of transfers that have been submitted.
    note,
    totalSignatures: 0,
    signed: [], // should the submitter automatically sign the first message?
    recipient,
    target,
    qty,
    lockLength,
    value,
    start: +SmartWeave.block.height,
  };

  state.foundation.actions.push(foundationAction);
  return { state };
};
