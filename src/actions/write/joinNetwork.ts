import {
  DEFAULT_INSUFFICIENT_FUNDS_MESSAGE,
  MAX_DELEGATES,
  MAX_GATEWAY_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { isValidArweaveBase64URL, isValidFQDN } from '../../utilities';

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
      fqdn,
      port,
      protocol,
      openDelegation = false,
      delegateAllowList = [],
      note,
    },
  }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const settings = state.settings;
  const gateways = state.gateways;

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
    throw new ContractError(DEFAULT_INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (qty < settings.minNetworkJoinStakeAmount) {
    throw new ContractError(
      `Quantity must be greater than or equal to the minimum network join stake amount ${settings.minNetworkJoinStakeAmount}.`,
    );
  }

  if (typeof label !== 'string' || label.length > MAX_GATEWAY_LABEL_LENGTH) {
    throw new ContractError('Label format not recognized.');
  }

  // TODO: MAX PORT NUMBER as constant
  if (!Number.isInteger(port) || port > 65535) {
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

  if (typeof openDelegation !== 'boolean') {
    throw new ContractError('Open Delegation must be true or false.');
  }

  if (!Array.isArray(delegateAllowList)) {
    throw new ContractError(
      'Delegate allow list must contain an array of valid Arweave addresses.',
    );
  }

  if (delegateAllowList.length > MAX_DELEGATES){
    throw ContractError('Invalid number of delegates.')
  }

  for (let i = 0; i < delegateAllowList.length; i += 1) {
    if (!isValidArweaveBase64URL(delegateAllowList[i])) {
      throw new ContractError(
        `${delegateAllowList[i]} is an invalid Arweave address. Delegate allow list must contain valid arweave addresses.`,
      );
    }
  }

  if (caller in gateways) {
    throw new ContractError("This Gateway's wallet is already registered");
  }

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
    delegates: {},
    settings: {
      label,
      fqdn,
      port,
      protocol,
      openDelegation,
      delegateAllowList,
      note,
    },
    status: NETWORK_JOIN_STATUS,
    start: +SmartWeave.block.height, // TODO: timestamp vs. height
    end: 0,
  };

  return { state };
};
