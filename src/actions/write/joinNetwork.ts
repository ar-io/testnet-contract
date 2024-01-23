import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE,
  INVALID_OBSERVER_WALLET,
  MIN_DELEGATED_STAKE,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import {
  ContractWriteResult,
  IOState,
  PstAction,
  TransactionId,
} from '../../types';
import {
  getInvalidAjvMessage,
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateJoinNetwork } from '../../validations';

export class JoinNetwork {
  qty: number;
  fqdn: string;
  label: string;
  note: string;
  properties: string;
  protocol: 'http' | 'https';
  port: number;
  observerWallet: string;
  allowDelegatedStaking: boolean;
  delegateRewardShareRatio: number;
  reservedDelegates: string[];
  minDelegatedStake: number;

  constructor(input: any, caller: TransactionId) {
    // validate using ajv validator
    if (!validateJoinNetwork(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateJoinNetwork, input, 'joinNetwork'),
      );
    }

    const {
      qty,
      label,
      port,
      fqdn,
      note,
      protocol,
      properties,
      observerWallet = caller,
      allowDelegatedStaking,
      delegateRewardShareRatio,
      reservedDelegates,
      minDelegatedStake,
    } = input;
    this.qty = qty;
    this.label = label;
    this.port = port;
    this.protocol = protocol;
    this.properties = properties;
    this.fqdn = fqdn;
    this.note = note;
    this.observerWallet = observerWallet;
    // TODO clean this up
    if (allowDelegatedStaking !== undefined) {
      this.allowDelegatedStaking = allowDelegatedStaking;
    } else {
      this.allowDelegatedStaking = false;
    }
    if (delegateRewardShareRatio !== undefined) {
      this.delegateRewardShareRatio = delegateRewardShareRatio;
    } else {
      this.delegateRewardShareRatio = 0;
    }
    if (reservedDelegates !== undefined) {
      this.reservedDelegates = reservedDelegates;
    } else {
      this.reservedDelegates = [];
    }
    if (minDelegatedStake !== undefined) {
      this.minDelegatedStake = minDelegatedStake;
    } else {
      this.minDelegatedStake = MIN_DELEGATED_STAKE;
    }
  }
}

// Adds a gateway into the address registry and joins it to the ar.io network
export const joinNetwork = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, gateways = {}, settings } = state;
  const { registry: registrySettings } = settings;

  const { qty, observerWallet, ...gatewaySettings } = new JoinNetwork(
    input,
    caller,
  );

  if (!walletHasSufficientBalance(balances, caller, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (qty < registrySettings.minNetworkJoinStakeAmount) {
    throw new ContractError(INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE);
  }

  if (caller in gateways) {
    throw new ContractError(INVALID_GATEWAY_EXISTS_MESSAGE);
  }

  if (
    Object.values(gateways).some(
      (gateway) => gateway.observerWallet === observerWallet,
    )
  ) {
    throw new ContractError(INVALID_OBSERVER_WALLET);
  }

  // Join the network
  unsafeDecrementBalance(state.balances, caller, qty);
  state.gateways[caller] = {
    operatorStake: qty,
    delegatedStake: 0, // defaults to no delegated stake
    observerWallet, // defaults to caller
    vaults: {},
    delegates: {},
    settings: {
      ...gatewaySettings,
    },
    status: NETWORK_JOIN_STATUS,
    start: +SmartWeave.block.height, // TODO: timestamp vs. height
    end: 0,
  };

  return { state };
};
