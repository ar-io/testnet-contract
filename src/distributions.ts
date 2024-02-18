import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
} from './constants';
import { Balances, Gateways, IOToken, WalletAddress } from './types';
import {
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from './utilities';

export function safeDelegateDistribution({
  balances,
  gateways,
  protocolAddress,
  gatewayAddress,
  delegateAddress,
  qty,
}: {
  balances: Balances;
  gateways: Gateways;
  protocolAddress: WalletAddress;
  gatewayAddress: WalletAddress;
  delegateAddress: WalletAddress;
  qty: IOToken;
}): void {
  if (balances[protocolAddress] === null || isNaN(balances[protocolAddress])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, protocolAddress, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (!gateways[gatewayAddress]) {
    throw new ContractError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  }

  if (!gateways[gatewayAddress].delegates[delegateAddress]) {
    throw new ContractError('Delegate not staked on this gateway.');
  }

  // Increase the individual delegate's stake
  gateways[gatewayAddress].delegates[delegateAddress].delegatedStake +=
    qty.valueOf();

  // Increase the gateway's total delegated stake
  gateways[gatewayAddress].totalDelegatedStake += qty.valueOf();

  unsafeDecrementBalance(balances, protocolAddress, qty.valueOf());
}

export function safeGatewayStakeDistribution({
  balances,
  gateways,
  protocolAddress,
  gatewayAddress,
  qty,
}: {
  balances: Balances;
  gateways: Gateways;
  protocolAddress: WalletAddress;
  gatewayAddress: WalletAddress;
  qty: IOToken;
}): void {
  if (balances[protocolAddress] === null || isNaN(balances[protocolAddress])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, protocolAddress, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (!gateways[gatewayAddress]) {
    throw new ContractError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  }

  // Increase the gateway's total delegated stake
  gateways[gatewayAddress].operatorStake += qty.valueOf();

  unsafeDecrementBalance(balances, protocolAddress, qty.valueOf());
}
