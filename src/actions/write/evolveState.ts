import {
  AUCTION_SETTINGS,
  DEMAND_FACTORING_SETTINGS,
  NON_CONTRACT_OWNER_MESSAGE,
} from '../../constants';
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

  // update the auction settings object
  state.settings.auctions = AUCTION_SETTINGS;

  // update demand factoring
  state.demandFactoring = {
    periodZeroBlockHeight: +SmartWeave.block.height,
    currentPeriod: 0,
    trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
    purchasesThisPeriod: 0,
    demandFactor: 1,
    consecutivePeriodsWithMinDemandFactor: 0,
  };

  return { state };
};
