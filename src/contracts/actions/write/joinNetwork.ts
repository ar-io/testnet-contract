import { MAX_NOTE_LENGTH } from "@/constants";
import { isipV4Address } from "@/contracts/utilities";
import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Adds a gateway into the address registry and joins it to the ar.io network
export const joinNetwork = async (
  state: IOState,
  {
    caller,
    input: {
      qty,
      label,
      sslFingerprint,
      ipV4Address,
      url,
      port,
      protocol,
      openDelegation,
      delegateAllowList,
      note,
    },
  }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const settings = state.settings;
  const gateways = state.gateways;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }

  if (!balances[caller]) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to stake ${qty} token(s)!`
    );
  }

  if (qty < settings.minGatewayStakeAmount) {
    throw new ContractError(
      "Quantity must be greater than or equal to the minimum gateway stake amount."
    );
  }

  if (typeof label !== "string") {
    throw new ContractError("Label format not recognized.");
  }

  if (!Number.isInteger(port) || port > 65535) {
    throw new ContractError("Invalid port number.");
  }

  if (!(protocol === "http" || protocol === "https")) {
    throw new ContractError("Invalid protocol, must be http or https.");
  }

  if (protocol === "https" && sslFingerprint === undefined) {
    throw new ContractError(
      "Please provide an SSL Fingerprint for the certificate used for this HTTPS url."
    );
  }

  if (ipV4Address === undefined && url === undefined) {
    throw new ContractError(
      "Please provide an IP address or URL to access this gateway"
    );
  }

  if (ipV4Address && !isipV4Address(ipV4Address)) {
    throw new ContractError("Not a valid ipv4 address.");
  }

  if (note) {
    if (typeof note !== "string") {
      throw new ContractError("Note format not recognized.");
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ContractError("Note is too long.");
    }
  }

  if (openDelegation) {
    if (typeof openDelegation !== "boolean") {
      throw new ContractError("Open Delegation must be true or false.");
    }
  } else {
    openDelegation = true; // by default, gateways are open for delegation
  }

  if (delegateAllowList) {
    if (!Array.isArray(delegateAllowList)) {
      throw new ContractError(
        "Delegate allow list must contain arweave addresses."
      );
    }
  } else {
    delegateAllowList = []; // by default, gateways allow any community delegate
  }

  if (caller in gateways) {
    throw new ContractError("This Gateway's wallet is already registered");
  } else {
    // Join the network
    state.balances[caller] -= qty;
    state.gateways[caller] = {
      operatorStake: qty,
      delegatedStake: 0,
      vaults: [
        {
          balance: qty,
          start: +SmartWeave.block.height,
          end: 0,
        },
      ],
      settings: {
        label,
        sslFingerprint,
        ipV4Address,
        url,
        port,
        openDelegation,
        delegateAllowList,
        protocol,
      }, // All of the settings related to this gateway
      delegates: {},
    };
  }
  return { state };
};
