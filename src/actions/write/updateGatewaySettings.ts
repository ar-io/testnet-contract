import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  INVALID_OBSERVER_WALLET,
  MIN_DELEGATED_STAKE,
} from '../../constants';
import {
  BlockHeight,
  ContractWriteResult,
  Gateway,
  IOState,
  PstAction,
  WalletAddress,
  mIOToken,
} from '../../types';
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
    autoStake: boolean;
    allowDelegatedStaking: boolean;
    delegateRewardShareRatio: number;
    minDelegatedStake: mIOToken;
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
      autoStake,
      allowDelegatedStaking,
      delegateRewardShareRatio,
      minDelegatedStake,
    } = input;
    this.settings = {
      ...(fqdn !== undefined && { fqdn }),
      ...(label !== undefined && { label }),
      ...(note !== undefined && { note }),
      ...(properties !== undefined && { properties }),
      ...(protocol !== undefined && { protocol }),
      ...(port !== undefined && { port }),
      ...(autoStake !== undefined && { autoStake }),
      ...(allowDelegatedStaking !== undefined && { allowDelegatedStaking }),
      ...(delegateRewardShareRatio !== undefined && {
        delegateRewardShareRatio,
      }),
      ...(minDelegatedStake !== undefined && {
        minDelegatedStake: new mIOToken(minDelegatedStake),
      }),
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
    updatedSettings.minDelegatedStake &&
    updatedSettings.minDelegatedStake.isLessThan(MIN_DELEGATED_STAKE)
  ) {
    throw new ContractError(
      `The minimum delegated stake must be at least ${MIN_DELEGATED_STAKE}`,
    );
  }

  if (
    Object.entries(gateways).some(
      ([gatewayAddress, gateway]: [WalletAddress, Gateway]) =>
        gateway.observerWallet === updatedObserverWallet &&
        gatewayAddress !== caller,
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
      ...(updatedSettings.minDelegatedStake && {
        minDelegatedStake: updatedSettings.minDelegatedStake.valueOf(),
      }),
    },
  };

  // vault all delegated stakes if it is disabled, we'll return stack at the proper end heights of the vault
  if (
    updatedSettings.allowDelegatedStaking === false &&
    Object.keys(gateway.delegates).length
  ) {
    const interactionHeight = new BlockHeight(+SmartWeave.block.height);
    // Add tokens from each delegate to a vault that unlocks after the delegate withdrawal period ends
    const delegateEndHeight = interactionHeight.plus(
      DELEGATED_STAKE_UNLOCK_LENGTH,
    );
    for (const address in updatedGateway.delegates) {
      updatedGateway.delegates[address].vaults[SmartWeave.transaction.id] = {
        balance: updatedGateway.delegates[address].delegatedStake,
        start: interactionHeight.valueOf(),
        end: delegateEndHeight.valueOf(),
      };

      // reduce gateway stake and set this delegate stake to 0
      updatedGateway.totalDelegatedStake -=
        updatedGateway.delegates[address].delegatedStake;
      updatedGateway.delegates[address].delegatedStake = 0;
    }
  }

  // if allowDelegateStaking is currently false, and you want to set it to true - you have to wait until all the vaults have been returned
  if (
    updatedSettings.allowDelegatedStaking === true &&
    gateway.settings.allowDelegatedStaking === false &&
    Object.keys(gateway.delegates).length > 0
  ) {
    throw new ContractError(
      'You cannot enable delegated staking until all delegated stakes have been withdrawn.',
    );
  }

  // update the contract state
  state.gateways[caller] = updatedGateway;

  return { state };
};
