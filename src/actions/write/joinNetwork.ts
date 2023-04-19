import {
  DEFAULT_INSUFFICIENT_FUNDS_MESSAGE,
  MAX_NOTE_LENGTH,
} from '@/constants';
import { isValidArweaveBase64URL, isValidFQDN } from '@/utilities';

import { ContractResult, IOState, PstAction } from '../../types';

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

  if (typeof label !== 'string') {
    throw new ContractError('Label format not recognized.');
  }

  if (!Number.isInteger(port) || port > 65535) {
    throw new ContractError('Invalid port number.');
  }

  if (!(protocol === 'http' || protocol === 'https')) {
    throw new ContractError('Invalid protocol, must be http or https.');
  }

  // check if it is a valid subdomain name for the smartweave contract
  const isFQDN = isValidFQDN(fqdn);
  if (fqdn === undefined || typeof fqdn !== 'string' || !isFQDN) {
    throw new ContractError(
      'Please provide a fully qualified domain name to access this gateway',
    );
  }

  if (note) {
    if (typeof note !== 'string') {
      throw new ContractError('Note format not recognized.');
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ContractError('Note is too long.');
    }
  }

  if (typeof openDelegation !== 'boolean') {
    throw new ContractError('Open Delegation must be true or false.');
  }

  if (!Array.isArray(delegateAllowList)) {
    throw new ContractError(
      'Delegate allow list must contain an array of valid Arweave addresses.',
    );
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
        fqdn,
        port,
        openDelegation,
        delegateAllowList,
        protocol,
      },
      delegates: {},
    };
  }
  return { state };
};
