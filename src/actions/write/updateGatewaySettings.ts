import {
  MAINTENANCE_MODE_STATUS,
  MAX_GATEWAY_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { isValidArweaveBase64URL, isValidFQDN } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

// Updates any of the settings of an existing gateway
export const updateGatewaySettings = async (
  state: IOState,
  {
    caller,
    input: {
      label,
      fqdn,
      port,
      protocol,
      openDelegation,
      delegateAllowList,
      note,
      status,
    },
  }: PstAction,
): Promise<ContractResult> => {
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError('This caller does not have a registered gateway.');
  }

  if (label) {
    if (typeof label !== 'string' || label.length > MAX_GATEWAY_LABEL_LENGTH) {
      throw new ContractError('Label format not recognized.');
    } else {
      gateways[caller].settings.label = label;
    }
  }

  if (port) {
    if (!Number.isInteger(port) || port > 65535) {
      throw new ContractError('Invalid port number.');
    } else {
      gateways[caller].settings.port = port;
    }
  }

  if (protocol) {
    if (!(protocol === 'http' || protocol === 'https')) {
      throw new ContractError('Invalid protocol, must be http or https.');
    } else {
      gateways[caller].settings.protocol = protocol;
    }
  }

  // check if it is a valid fully qualified domain name
  if (fqdn) {
    const isFQDN = isValidFQDN(fqdn);
    if (typeof fqdn !== 'string' || !isFQDN) {
      throw new ContractError(
        'Please provide a fully qualified domain name to access this gateway',
      );
    } else {
      gateways[caller].settings.fqdn = fqdn;
    }
  }

  if (note) {
    if (typeof note !== 'string') {
      throw new ContractError('Note format not recognized.');
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ContractError('Note is too long.');
    } else {
      gateways[caller].settings.note = note;
    }
  }

  if (openDelegation !== undefined) {
    if (typeof openDelegation !== 'boolean') {
      throw new ContractError('Open Delegation must be true or false.');
    } else {
      gateways[caller].settings.openDelegation = openDelegation;
    }
  }

  if (delegateAllowList) {
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
    gateways[caller].settings.delegateAllowList = delegateAllowList;
  }

  if (status) {
    if (
      !(status === MAINTENANCE_MODE_STATUS || status === NETWORK_JOIN_STATUS)
    ) {
      throw new ContractError(
        `Invalid gatway status, must be set to ${MAINTENANCE_MODE_STATUS} or ${NETWORK_JOIN_STATUS}`,
      );
    } else {
      gateways[caller].status = status;
    }
  }
  return { state };
};
