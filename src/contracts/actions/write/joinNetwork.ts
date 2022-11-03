import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Sets an existing record and if one does not exist, it cre
export const joinNetwork = async (
  state: ArNSState,
  {
    caller,
    input: { qty, label, sslFingerprint, ipAddress, url, port, protocol },
  }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const settings = state.settings;
  const gateways = state.gateways;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError("Quantity must be a positive integer.");
  }

  const balance = balances[caller];
  if (isNaN(balance) || balance < qty) {
    throw new ContractError("Not enough balance.");
  }

  if (qty < settings.minGatewayStakeAmount) {
    throw new ContractError(
      "Quantity must be greater than or equal to the minimum gateway stake amount."
    );
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

  if (ipAddress === undefined && url === undefined) {
    throw new ContractError(
      "Please provide an IP address or URL to access this gateway"
    );
  }

  if (caller in gateways) {
    throw new ContractError("This Gateway's wallet is already registered");
  } else {
    // Join the network
    state.balances[caller] -= qty;
    state.gateways[caller] = {
      balance: qty,
      settings: {
        label,
        sslFingerprint,
        ipAddress,
        url,
        port,
        protocol,
      }, // All of the settings related to this gateway
      delegates: {},
    };
  }
  return { state };
};
