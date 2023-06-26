import { ContractResult, IOState, PstAction } from '../../types';

// TODO: a temporary helper function while we validate state contract interactions
export const updateState = (
  state: IOState,
  { input }: PstAction,
): ContractResult => {
  const { state: newState } = input;

  return {
    state: {
      ...state,
      ...newState,
    },
  };
};
