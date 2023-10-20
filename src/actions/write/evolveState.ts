import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError: any;

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
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
