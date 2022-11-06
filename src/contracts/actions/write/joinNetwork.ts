import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Adds a gateway into the address registry and joins it to the ar.io network
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
      operatorStake: qty,
      delegatedStake: 0,
      vaults: [{
        balance: qty,
        start: +SmartWeave.block.height,
        end: 0,
      }],
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
