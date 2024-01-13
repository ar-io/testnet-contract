import {
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  INVALID_OBSERVER_WALLET,
} from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateUpdateGateway } from '../../validations';

export class GatewaySettings {
  observerWallet: string;
  settings: {
    fqdn?: string;
    label?: string;
    note?: string;
    properties?: string;
    protocol?: 'http' | 'https';
    port?: number;
    allowDelegatedStaking: boolean;
    delegateRewardRatio: number;
    reservedDelegates: string[];
    minDelegatedStake: number;
  };

  constructor(input: any) {
    // validate using ajv validator
    if (!validateUpdateGateway(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateUpdateGateway, input, 'updateGateway'),
      );
    }

    const {
      label,
      port,
      fqdn,
      note,
      protocol,
      properties,
      observerWallet,
      allowDelegatedStaking,
      delegateRewardRatio,
      reservedDelegates,
      minDelegatedStake,
    } = input;
    this.settings = {
      ...(fqdn !== undefined && { fqdn }),
      ...(label !== undefined && { label }),
      ...(note !== undefined && { note }),
      ...(properties !== undefined && { properties }),
      ...(protocol !== undefined && { protocol }),
      ...(port !== undefined && { port }),
      ...(allowDelegatedStaking !== undefined && { allowDelegatedStaking }),
      ...(delegateRewardRatio !== undefined && { delegateRewardRatio }),
      ...(reservedDelegates !== undefined && { reservedDelegates }),
      ...(minDelegatedStake !== undefined && { minDelegatedStake }),
    };
    this.observerWallet = observerWallet;
  }
}

// Updates any of the settings of an existing gateway
export const updateGatewaySettings = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { gateways = {} } = state;
  const { observerWallet: updatedObserverWallet, settings: updatedSettings } =
    new GatewaySettings(input);
  const gateway = gateways[caller];
  if (!gateway) {
    throw new ContractError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  }

  if (
    Object.values(gateways).some(
      (gateway) => gateway.observerWallet === updatedObserverWallet,
    )
  ) {
    throw new ContractError(INVALID_OBSERVER_WALLET);
  }
  // update observer wallet, and any settings provided
  const updatedGateway = {
    ...gateway,
    observerWallet: updatedObserverWallet || gateways[caller].observerWallet,
    settings: {
      ...gateway.settings,
      ...updatedSettings,
    },
  };

  // update the contract state
  state.gateways[caller] = updatedGateway;

  return { state };
};
