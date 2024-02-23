import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  GATEWAY_LEAVE_BLOCK_LENGTH,
  GATEWAY_REGISTRY_SETTINGS,
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
      minimumGatewayJoinLength: new BlockHeight(
        GATEWAY_REGISTRY_SETTINGS.minGatewayJoinLength,
      ),
    })
  ) {
    throw new ContractError(
      `The gateway is not eligible to leave the network. It must be joined for a minimum of ${GATEWAY_REGISTRY_SETTINGS.minGatewayJoinLength} blocks and can not already be leaving the network. Current status: ${gateways[caller].status}`,
    );
  }

  const gatewayEndHeight =
    +SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH;
  const gatewayStakeWithdrawHeight =
    +SmartWeave.block.height +
    GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength;
  const delegateEndHeight =
    +SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH;

  // Add minimum staked tokens to a vault that unlocks after the gateway completely leaves the network
  gateways[caller].vaults[caller] = {
    balance: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
    start: +SmartWeave.block.height,
    end: gatewayEndHeight,
  };

  gateways[caller].operatorStake -= GATEWAY_REGISTRY_SETTINGS.minOperatorStake;

  // If there are tokens remaining, add them to a vault that unlocks after the gateway stake withdrawal time
  if (gateways[caller].operatorStake > 0) {
    gateways[caller].vaults[SmartWeave.transaction.id] = {
      balance: gateways[caller].operatorStake,
      start: +SmartWeave.block.height,
      end: gatewayStakeWithdrawHeight,
    };
  }

  // Remove all tokens from the operator's stake
  gateways[caller].operatorStake = 0;

  // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
  gateways[caller].end = gatewayEndHeight;
  gateways[caller].status = NETWORK_LEAVING_STATUS;

  // Add tokens from each delegate to a vault that unlocks after the delegate withdrawal period ends
  for (const address in gateways[caller].delegates) {
    gateways[caller].delegates[address].vaults[SmartWeave.transaction.id] = {
      balance: gateways[caller].delegates[address].delegatedStake,
      start: +SmartWeave.block.height,
      end: delegateEndHeight,
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
