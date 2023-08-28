import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // evolve records
  const { records } = state;
  const newRecords = Object.keys(records).reduce((acc, key) => {
    acc[key] = {
      ...records[key],
      startTimestamp: Date.now(),
    };
    return acc;
  }, {});

  state.records = newRecords;

  return { state };
};
