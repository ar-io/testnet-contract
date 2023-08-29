import {
  MAX_GATEWAY_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PORT_NUMBER,
  NETWORK_HIDDEN_STATUS,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { isValidArweaveBase64URL, isValidFQDN } from '../../utilities';

declare const ContractError;

// Updates any of the settings of an existing gateway
export const updateGatewaySettings = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { gateways = {} } = state;

  // TODO: add object parsing validation
  const { label, fqdn, port, protocol, properties, note, status } =
    input as any;

  // TODO: consistent checks
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
    if (!Number.isInteger(port) || port > MAX_PORT_NUMBER) {
      throw new ContractError('Invalid port number.');
    } else {
      gateways[caller].settings.port = port;
    }
  }

  if (protocol) {
    // Gateway status check
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

  if (properties) {
    if (!isValidArweaveBase64URL(properties)) {
      throw new ContractError(
        'Invalid property.  Must be a valid Arweave transaction ID.',
      );
    } else {
      gateways[caller].settings.properties = properties;
    }
  } else if (properties === '') {
    gateways[caller].settings.properties = properties;
  }

  if (note || note === '') {
    if (typeof note !== 'string') {
      throw new ContractError('Note format not recognized.');
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ContractError('Note is too long.');
    } else {
      gateways[caller].settings.note = note;
    }
  }

  if (status) {
    if (!(status === NETWORK_HIDDEN_STATUS || status === NETWORK_JOIN_STATUS)) {
      throw new ContractError(
        `Invalid gateway status, must be set to ${NETWORK_HIDDEN_STATUS} or ${NETWORK_JOIN_STATUS}`,
      );
    } else {
      gateways[caller].status = status;
    }
  }

  // update the contract state
  state.gateways[caller] = gateways[caller];

  return { state };
};
