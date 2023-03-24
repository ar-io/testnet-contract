import {
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
  DEFAULT_TIERS,
  SECONDS_IN_A_YEAR,
} from '../../constants';

import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Temporary method to fix a broken contract state
export const updateState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
  }

  // Adds tiers and updates fees
  state = {
    ...state,
    fees: {
      ...DEFAULT_FEE_STRUCTURE,
    },
    tiers: {
      history: DEFAULT_TIERS,
      current: DEFAULT_TIERS.reduce(
        (acc, tier, index) => ({
          ...acc,
          [index + 1]: tier.id,
        }),
        {},
      ),
    },
  };

  // update state
  for (const key of Object.keys(state.records)) {
    if (state.records[key].contractTxId === undefined) {
      const endTimestamp = +SmartWeave.block.timestamp + SECONDS_IN_A_YEAR * 1;
      state.records[key] = {
        contractTxId: state.records[key].toString(),
        endTimestamp,
        tier: state.tiers.current[1],
      };
    }
  }

  return { state };
};
