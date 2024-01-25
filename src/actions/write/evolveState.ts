import {
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  INITIAL_EPOCH_DISTRIBUTION_DATA,
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

  // set the gateway stats
  const updatedGateways = Object.entries(state.gateways).reduce(
    (acc, [gatewayAddress, gateway]) => {
      const stats = DEFAULT_GATEWAY_PERFORMANCE_STATS;
      const updatedGatewayWithStats = {
        stats,
        ...gateway, // put this last so any existing stats persist
      };
      // set the gateway stats
      return {
        ...acc,
        [gatewayAddress]: updatedGatewayWithStats,
      };
    },
    {},
  );
  state.gateways = updatedGateways;

  // set the distributions and observations
  if (!state.distributions) {
    // set up the distributions
    state.distributions = {
      ...INITIAL_EPOCH_DISTRIBUTION_DATA,
    };

    // reset the observations
    state.observations = {};
  }

  return { state };
};
