import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { walletHasSufficientBalance } from '../../utilities';

declare const ContractError;

// Locks tokens into a new gateway operator vault
export const increaseOperatorStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { gateways = {}, balances } = state;

  // TODO: object type validation
  const { qty } = input as any;

  if (!(caller in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'This Gateway is in the process of leaving the network and cannot have its stake adjusted',
    );
  }

  if (!walletHasSufficientBalance(balances, caller, qty)) {
    throw new ContractError(
      `Caller balance not high enough to stake ${qty} token(s)!`,
    );
  }

  state.balances[caller] -= qty;
  state.gateways[caller].operatorStake += qty;
  return { state };
};
