import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
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

  // set each gateway to have an empty array of vaults
  for (const address in state.gateways) {
    state.gateways[address].observerWallet = address;
  }

  // remove existing auctions
  state.auctions = {};

  // update the auction settings object
  state.settings.auctions = {
    floorPriceMultiplier: 1,
    startPriceMultiplier: 50,
    auctionDuration: 5040,
    decayRate: 0.0225,
    decayInterval: 30,
  };

  return { state };
};
