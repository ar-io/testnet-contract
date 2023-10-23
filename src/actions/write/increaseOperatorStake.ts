import { NETWORK_LEAVING_STATUS } from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Locks tokens into a new gateway operator vault
export const increaseOperatorStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
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

  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to stake ${qty} token(s)!`,
    );
  }

  state.balances[caller] -= qty;
  state.gateways[caller].operatorStake += qty;
  return { state };
};
