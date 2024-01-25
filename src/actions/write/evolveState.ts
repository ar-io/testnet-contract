import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  INITIAL_PROTOCOL_BALANCE,
  NON_CONTRACT_OWNER_MESSAGE,
} from '../../constants';
import { safeTransfer } from '../../transfer';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // bump the protocol balance to the initial amount
  if (
    state.balances[owner] >= INITIAL_PROTOCOL_BALANCE &&
    state.balances[SmartWeave.contract.id] < INITIAL_PROTOCOL_BALANCE
  ) {
    const protocolBalance = state.balances[SmartWeave.contract.id] || 0;
    const differenceFromRequiredMinimum =
      INITIAL_PROTOCOL_BALANCE - protocolBalance;
    safeTransfer({
      balances: state.balances,
      fromAddress: owner,
      toAddress: SmartWeave.contract.id,
      qty: differenceFromRequiredMinimum,
    });
  }

  // targeting devnet
  if (state.distributions) {
    // the type has changed so we cast to any here intentionally
    const gatewayStats = (state.distributions as any).gateways;
    const observerStats = (state.distributions as any).observers;
    const updatedGateways = Object.keys(state.gateways).reduce(
      (acc, gatewayAddress) => {
        const gateway = state.gateways[gatewayAddress];
        const stats = {
          ...gatewayStats[gatewayAddress],
          ...observerStats[gateway.observerWallet],
        };
        const updatedGatewayWithStats = {
          ...gateway,
          stats,
        };
        return {
          ...acc,
          [gatewayAddress]: updatedGatewayWithStats,
        };
      },
      {},
    );
    state.gateways = updatedGateways;
  } else {
    // set up the distributions
    const epochStartHeight = +SmartWeave.block.height;
    const epochEndHeight = epochStartHeight + EPOCH_BLOCK_LENGTH - 1;
    const epochDistributionHeight = epochEndHeight + EPOCH_DISTRIBUTION_DELAY;
    state.distributions = {
      epochZeroStartHeight: epochStartHeight,
      epochStartHeight,
      epochEndHeight,
      epochDistributionHeight,
    };

    // set the observations
    state.observations = {};
  }

  return { state };
};
