import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  MIN_DELEGATED_STAKE,
  NETWORK_LEAVING_STATUS,
} from './constants';
import {
  Balances,
  BlockHeight,
  Gateways,
  IOToken,
  WalletAddress,
} from './types';
import {
  unsafeDecrementBalance,
  walletHasSufficientBalance,
} from './utilities';

export function safeDelegateStake({
  balances,
  gateways,
  fromAddress,
  gatewayAddress,
  qty,
  startHeight,
}: {
  balances: Balances;
  gateways: Gateways;
  fromAddress: WalletAddress;
  gatewayAddress: WalletAddress;
  qty: IOToken;
  startHeight: BlockHeight;
}): void {
  if (qty.valueOf() < MIN_DELEGATED_STAKE) {
    throw new ContractError(
      `Qty must be greater than the minimum delegated stake amount.`,
    );
  }

  if (balances[fromAddress] === null || isNaN(balances[fromAddress])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, fromAddress, qty.valueOf())) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  if (!gateways[gatewayAddress]) {
    throw new ContractError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  }

  if (gateways[gatewayAddress].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network and cannot have more stake delegated to it.',
    );
  }

  // TODO: Update the below to allow reservedGateways (once the DeepReadonly is figured out)
  if (!gateways[gatewayAddress].settings.allowDelegatedStaking) {
    throw new ContractError(`This Gateway does not allow delegated staking.`);
  }

  // If this delegate has staked before, update its amount, if not, create a new delegate staker
  if (gateways[gatewayAddress].delegates[fromAddress]) {
    gateways[gatewayAddress].delegates[fromAddress].delegatedStake +=
      qty.valueOf();
  } else {
    gateways[gatewayAddress].delegates[fromAddress] = {
      delegatedStake: qty.valueOf(),
      start: startHeight.valueOf(),
      end: 0,
      vaults: {},
    };
  }
  // Increase the gateways total delegated stake, and then decrement from the caller.
  gateways[gatewayAddress].delegatedStake += qty.valueOf();
  unsafeDecrementBalance(balances, fromAddress, qty.valueOf());
}
