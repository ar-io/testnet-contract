import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';
import { resetProtocolBalance } from '../../utilities';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  state.vaults = {};
  state.canEvolve = true;
  state.observations = {};
  state.distributions = {
    lastCompletedEpoch: +SmartWeave.block.height,
    passedObserverEpochs: {},
    passedGatewayEpochs: {},
  };

  for (const gateway of Object.values(state.gateways)) {
    gateway.vaults = {};
  }

  // reset protocol balance
  const { balances: updatedBalances } = resetProtocolBalance({
    balances: state.balances,
    auctions: state.auctions,
    vaults: state.vaults,
    gateways: state.gateways,
  });
  state.balances = updatedBalances;

  return { state };
};
