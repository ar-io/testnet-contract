import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  MAX_DELEGATES,
  NETWORK_LEAVING_STATUS,
} from './constants';
import {
  Balances,
  BlockHeight,
  Gateways,
  TransactionId,
  WalletAddress,
  mIOToken,
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
  qty: mIOToken;
  startHeight: BlockHeight;
}): void {
  if (balances[fromAddress] === null || isNaN(balances[fromAddress])) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (!walletHasSufficientBalance(balances, fromAddress, qty)) {
    throw new ContractError(INSUFFICIENT_FUNDS_MESSAGE);
  }

  const gateway = gateways[gatewayAddress];

  if (!gateway) {
    throw new ContractError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  }

  if (gateway.status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network and cannot have more stake delegated to it.',
    );
  }

  // TODO: when allowedDelegates is supported, check if it's in the array of allowed delegates
  if (!gateway.settings.allowDelegatedStaking) {
    throw new ContractError(
      `This Gateway does not allow delegated staking. Only allowed delegates can delegate stake to this Gateway.`,
    );
  }

  if (Object.keys(gateway.delegates).length > MAX_DELEGATES) {
    throw new ContractError(
      `This Gateway has reached its maximum amount of delegated stakers.`,
    );
  }

  // TODO: some behaviors we could consider - do we require a delegate to only be able to increase stake if they are above the current minimum stake of the operator
  // Additionally, if you're a delegate and not up to the current minimum, do you get any rewards?
  const existingDelegate = gateway.delegates[fromAddress];
  const minimumStakeForGatewayAndDelegate =
    // it already has a stake that is not zero
    existingDelegate && existingDelegate.delegatedStake !== 0
      ? 1 // delegate must provide at least one additional IO - we may want to change this to a higher amount. also need to consider if the operator increases the minmimum amount after you've already staked
      : gateway.settings.minDelegatedStake;

  if (qty.valueOf() < minimumStakeForGatewayAndDelegate) {
    throw new ContractError(
      `Qty must be greater than the minimum delegated stake amount.`,
    );
  }
  // If this delegate has staked before, update its amount, if not, create a new delegated staker
  // The quantity must also be greater than the minimum delegated stake set by the gateway
  if (!existingDelegate) {
    // create the new delegate stake
    gateways[gatewayAddress].delegates[fromAddress] = {
      delegatedStake: qty.valueOf(),
      start: startHeight.valueOf(),
      vaults: {},
    };
  } else {
    // increment the existing delegate's stake
    existingDelegate.delegatedStake += qty.valueOf();
  }
  // increase the total delegated stake for the gateway - TODO: this could be computed, as opposed to set in state
  gateways[gatewayAddress].totalDelegatedStake += qty.valueOf();
  // decrement the caller's balance
  unsafeDecrementBalance(balances, fromAddress, qty);
}

export function safeDecreaseDelegateStake({
  gateways,
  fromAddress,
  gatewayAddress,
  qty,
  id,
  startHeight,
}: {
  gateways: Gateways;
  fromAddress: WalletAddress;
  gatewayAddress: WalletAddress;
  qty: mIOToken;
  id: TransactionId;
  startHeight: BlockHeight;
}): void {
  if (!gateways[gatewayAddress]) {
    throw new ContractError(INVALID_GATEWAY_REGISTERED_MESSAGE);
  }

  const gateway = gateways[gatewayAddress];
  const existingDelegate = gateway.delegates[fromAddress];

  if (!existingDelegate) {
    throw new ContractError('This delegate is not staked at this gateway.');
  }

  const existingStake = new mIOToken(existingDelegate.delegatedStake);
  const requiredMinimumStake = new mIOToken(gateway.settings.minDelegatedStake);
  const maxAllowedToWithdraw = existingStake.minus(requiredMinimumStake);
  if (maxAllowedToWithdraw.isLessThan(qty) && !qty.equals(existingStake)) {
    throw new ContractError(
      `Remaining delegated stake must be greater than the minimum delegated stake amount.`,
    );
  }

  // Withdraw the qty delegate's stake
  gateways[gatewayAddress].delegates[fromAddress].delegatedStake -=
    qty.valueOf();
  // Lock the qty in a vault to be unlocked after withdrawal period
  gateways[gatewayAddress].delegates[fromAddress].vaults[id] = {
    balance: qty.valueOf(),
    start: startHeight.valueOf(),
    end: startHeight.plus(DELEGATED_STAKE_UNLOCK_LENGTH).valueOf(),
  };

  // Decrease the gateway's total delegated stake.
  gateways[gatewayAddress].totalDelegatedStake -= qty.valueOf();
}
