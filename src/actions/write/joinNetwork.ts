import {
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE,
  INVALID_OBSERVER_WALLET,
  MIN_DELEGATED_STAKE,
  MIN_OPERATOR_STAKE,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import {
  ContractWriteResult,
  IOState,
  IOToken,
  PstAction,
  TransactionId,
  mIOToken,
} from '../../types';
import {
  getInvalidAjvMessage,
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateJoinNetwork } from '../../validations';

export class JoinNetwork {
  qty: mIOToken;
  fqdn: string;
  label: string;
  note: string;
  properties: string;
  protocol: 'http' | 'https';
  port: number;
  observerWallet: string;
  autoStake: boolean;
  allowDelegatedStaking: boolean;
  delegateRewardShareRatio: number;
  minDelegatedStake: mIOToken;

  constructor(input: any, caller: TransactionId) {
    // validate using ajv validator
    if (!validateJoinNetwork(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateJoinNetwork, input, 'joinNetwork'),
      );
    }

    const {
      qty = MIN_OPERATOR_STAKE,
      label,
      port,
      fqdn,
      note,
      protocol,
      properties,
      observerWallet = caller,
      autoStake = false,
      allowDelegatedStaking = false,
      delegateRewardShareRatio = 0,
      minDelegatedStake = MIN_DELEGATED_STAKE,
    } = input;
    this.qty = new IOToken(qty).toMIO();
    this.label = label;
    this.port = port;
    this.protocol = protocol;
    this.properties = properties;
    this.fqdn = fqdn;
    this.note = note;
    this.observerWallet = observerWallet;
    this.autoStake = autoStake;
    this.allowDelegatedStaking = allowDelegatedStaking;
    this.delegateRewardShareRatio = delegateRewardShareRatio;
    this.minDelegatedStake = minDelegatedStake;
  }
}

// Adds a gateway into the address registry and joins it to the ar.io network
export const joinNetwork = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, gateways = {} } = state;

  const { qty, observerWallet, ...gatewaySettings } = new JoinNetwork(
    input,
    caller,
  );

  if (!walletHasSufficientBalance(balances, caller, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (qty.isLessThan(MIN_OPERATOR_STAKE)) {
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
    operatorStake: qty.valueOf(),
    totalDelegatedStake: 0, // defaults to no delegated stake
    observerWallet, // defaults to caller
    vaults: {},
    delegates: {},
    settings: {
      ...gatewaySettings,
      minDelegatedStake: gatewaySettings.minDelegatedStake.valueOf(),
    },
    status: NETWORK_JOIN_STATUS,
    start: +SmartWeave.block.height, // TODO: timestamp vs. height
    end: 0,
    stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
  };

  return { state };
};
