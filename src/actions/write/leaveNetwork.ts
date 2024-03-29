import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  GATEWAY_LEAVE_BLOCK_LENGTH,
  GATEWAY_REGISTRY_SETTINGS,
  MIN_OPERATOR_STAKE,
  NETWORK_LEAVING_STATUS,
} from '../../constants';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
} from '../../types';
import { isGatewayEligibleToLeave } from '../../utilities';

// Begins the network leave process for a gateway operator
export const leaveNetwork = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const gateways = state.gateways;
  const gateway = gateways[caller];
  const currentBlockHeight = new BlockHeight(+SmartWeave.block.height);

  if (!gateway) {
    throw new ContractError('The caller does not have a registered gateway.');
  }

  if (
    !isGatewayEligibleToLeave({
      gateway,
      currentBlockHeight,
      minimumGatewayJoinLength: GATEWAY_REGISTRY_SETTINGS.minGatewayJoinLength,
    })
  ) {
    throw new ContractError(
      `The gateway is not eligible to leave the network. It must be joined for a minimum of ${GATEWAY_REGISTRY_SETTINGS.minGatewayJoinLength} blocks and can not already be leaving the network. Current status: ${gateways[caller].status}`,
    );
  }

  const interactionHeight = new BlockHeight(+SmartWeave.block.height);

  const gatewayEndHeight = interactionHeight.plus(GATEWAY_LEAVE_BLOCK_LENGTH);
  const gatewayStakeWithdrawHeight = interactionHeight.plus(
    GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength,
  );
  const delegateEndHeight = interactionHeight.plus(
    DELEGATED_STAKE_UNLOCK_LENGTH,
  );

  // Add minimum staked tokens to a vault that unlocks after the gateway completely leaves the network
  gateways[caller].vaults[caller] = {
    balance: MIN_OPERATOR_STAKE.valueOf(),
    start: interactionHeight.valueOf(),
    end: gatewayEndHeight.valueOf(),
  };

  gateways[caller].operatorStake -= MIN_OPERATOR_STAKE.valueOf();

  // If there are tokens remaining, add them to a vault that unlocks after the gateway stake withdrawal time
  if (gateways[caller].operatorStake > 0) {
    gateways[caller].vaults[SmartWeave.transaction.id] = {
      balance: gateways[caller].operatorStake,
      start: interactionHeight.valueOf(),
      end: gatewayStakeWithdrawHeight.valueOf(),
    };
  }

  // Remove all tokens from the operator's stake
  gateways[caller].operatorStake = 0;

  // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
  gateways[caller].end = gatewayEndHeight.valueOf();
  gateways[caller].status = NETWORK_LEAVING_STATUS;

  // Add tokens from each delegate to a vault that unlocks after the delegate withdrawal period ends
  for (const address in gateways[caller].delegates) {
    gateways[caller].delegates[address].vaults[SmartWeave.transaction.id] = {
      balance: gateways[caller].delegates[address].delegatedStake,
      start: interactionHeight.valueOf(),
      end: delegateEndHeight.valueOf(),
    };

    // reduce gateway stake and set this delegate stake to 0
    gateways[caller].totalDelegatedStake -=
      gateways[caller].delegates[address].delegatedStake;
    gateways[caller].delegates[address].delegatedStake = 0;
  }

  // set state
  state.gateways = gateways;
  return { state };
};
