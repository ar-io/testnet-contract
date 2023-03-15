import { SECONDS_IN_A_YEAR } from '@/constants';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;
declare const SmartWeave: any;

// Temporary method to fix a broken contract state
export const fixState = async (
  state: IOState,
  { caller, input: {} }: PstAction, // eslint-disable-line
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError('Caller cannot evolve the contract');
  }

  for (const key of Object.keys(state.records)) {
    if (state.records[key].contractTxId === undefined) {
      // set the end lease period for this based on number of years
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
