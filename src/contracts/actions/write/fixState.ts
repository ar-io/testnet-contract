import { DEFAULT_NON_CONTRACT_OWNER_MESSAGE, SECONDS_IN_A_YEAR } from '@/constants';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;
declare const SmartWeave: any;

// Temporary method to fix a broken contract state
export const fixState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
  }

  for (const key of Object.keys(state.records)) {
    if (state.records[key].contractTxId === undefined) {
      const endTimestamp = +SmartWeave.block.timestamp;
      +SECONDS_IN_A_YEAR * 1; // default tier
      state.records[key] = {
        contractTxId: state.records[key].toString(),
        endTimestamp,
        tier: state.tiers.current[1],
      };
    }
  }

  return { state };
};
