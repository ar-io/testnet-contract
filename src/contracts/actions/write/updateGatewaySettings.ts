import { MAX_NOTE_LENGTH } from "@/constants";
import { isipV4Address } from "@/contracts/utilities";
import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Adds a gateway into the address registry and joins it to the ar.io network
export const updateGatewaySettings = async (
  state: ArNSState,
  {
    caller,
    input: {
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
  const gateways = state.gateways;

  if (caller in gateways) {
    if (port) {
      if (!Number.isInteger(port) || port > 65535) {
        throw new ContractError("Invalid port number.");
      } else {
        state.gateways[caller].settings.port = port;
      }
    }

    if (protocol) {
      if (!(protocol === "http" || protocol === "https")) {
        throw new ContractError("Invalid protocol, must be http or https.");
      } else if (protocol === "https" && sslFingerprint === undefined) {
        throw new ContractError(
          "Please provide an SSL Fingerprint for the certificate used for this HTTPS url."
        );
      } else {
        state.gateways[caller].settings.protocol = protocol;
      }
    }

    if (sslFingerprint) {
      if (protocol !== "https") {
        throw new ContractError(
          "This gateway must be set to HTTPS protocol first"
        );
      } else {
        state.gateways[caller].settings.sslFingerprint = sslFingerprint;
      }
    }

    if (ipV4Address) {
      if (isipV4Address(ipV4Address)) {
        state.gateways[caller].settings.ipV4Address = ipV4Address;
      } else {
        throw new ContractError("Not a valid ipv4 address.");
      }
    }

    if (url) {
      state.gateways[caller].settings.url = url;
    }

    if (label) {
      state.gateways[caller].settings.label = label;
    }

    if (note) {
      if (typeof note !== "string") {
        throw new ContractError("Note format not recognized.");
      }
      if (note.length > MAX_NOTE_LENGTH) {
        throw new ContractError("Note is too long.");
      }
      state.gateways[caller].settings.note = note;
    }

    if (openDelegation) {
      if (typeof openDelegation !== "boolean") {
        throw new ContractError("Open Delegation must be true or false.");
      } else {
        state.gateways[caller].settings.openDelegation = openDelegation;
      }
    }

    if (delegateAllowList) {
      if (!Array.isArray(delegateAllowList)) {
        throw new ContractError(
          "Delegate allow list must contain arweave addresses."
        );
      } else {
        state.gateways[caller].settings.delegateAllowList = delegateAllowList;
      }
    }
  } else {
    throw new ContractError("This Gateway is not joined to the network");
  }
  return { state };
};
