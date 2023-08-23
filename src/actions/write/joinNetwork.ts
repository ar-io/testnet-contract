import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_GATEWAY_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PORT_NUMBER,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { isValidFQDN } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

// Adds a gateway into the address registry and joins it to the ar.io network
export const joinNetwork = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { balances, gateways = {}, settings } = state;
  const { registry: registrySettings } = settings;

  // TODO: object parse validation
  const { qty, label, fqdn, port, protocol, note } = input as any;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
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
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (qty < registrySettings.minNetworkJoinStakeAmount) {
    throw new ContractError(
      `Quantity must be greater than or equal to the minimum network join stake amount ${registrySettings.minNetworkJoinStakeAmount}.`,
    );
  }

  if (typeof label !== 'string' || label.length > MAX_GATEWAY_LABEL_LENGTH) {
    throw new ContractError('Label format not recognized.');
  }

  if (!Number.isInteger(port) || port > MAX_PORT_NUMBER) {
    throw new ContractError('Invalid port number.');
  }

  // TODO: use array of type as const for checking these, then use .includes()
  if (!(protocol === 'http' || protocol === 'https')) {
    throw new ContractError('Invalid protocol, must be http or https.');
  }

  // check if it is a valid fully qualified domain name
  const isFQDN = isValidFQDN(fqdn);
  if (fqdn === undefined || typeof fqdn !== 'string' || !isFQDN) {
    throw new ContractError(
      'Please provide a fully qualified domain name to access this gateway',
    );
  }

  if (note && typeof note !== 'string' && note > MAX_NOTE_LENGTH) {
    throw new ContractError('Invalid note.');
  }

  if (caller in gateways) {
    throw new ContractError("This Gateway's wallet is already registered");
  }

  // Join the network
  state.balances[caller] -= qty;
  state.gateways[caller] = {
    operatorStake: qty,
    vaults: [
      {
        balance: qty,
        start: +SmartWeave.block.height,
        end: 0,
      },
    ],
    settings: {
      label,
      fqdn,
      port,
      protocol,
      note,
    },
    status: NETWORK_JOIN_STATUS,
    start: +SmartWeave.block.height, // TODO: timestamp vs. height
    end: 0,
  };

  return { state };
};
