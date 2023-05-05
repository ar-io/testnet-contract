import {
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_EVOLUTION_COMPLETE_STATUS,
} from '../../constants';
import {
  ContractEvolutionInput,
  ContractResult,
  IOState,
  PstAction,
} from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Updates this contract to new source code
export const evolve = async (
  state: IOState,
  { input: { value } }: PstAction,
): Promise<ContractResult> => {
  const foundationActions = state.foundation.actions;
  const index = +value;

  if (
    foundationActions[index].type === 'evolveContract' &&
    foundationActions[index].status === FOUNDATION_ACTION_PASSED_STATUS &&
    (foundationActions[index].value as ContractEvolutionInput).blockHeight <=
      +SmartWeave.block.height
  ) {
    state.foundation.actions[index].status ===
      FOUNDATION_EVOLUTION_COMPLETE_STATUS;
    state.evolve = (
      foundationActions[index].value as ContractEvolutionInput
    ).contractSrc;
  } else {
    throw new ContractError('Invalid contract evolution operation.');
  }

  return { state };
};
