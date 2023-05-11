import {
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS,
} from '../../constants';
import {
  ContractResult,
  DelayedEvolveInput,
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
  const foundationActions = state.foundation?.actions ?? {};
  const index = +value; // We look up the source code tx to evolve to by the corresponding foundation action id

  // There are no caller checks, as anyone can invoke the evolutiona as long as conditions are met
  if (
    Number.isInteger(index) &&
    index >= 0 &&
    foundationActions[index].type === 'delayedEvolve' &&
    foundationActions[index].status === FOUNDATION_ACTION_PASSED_STATUS &&
    (foundationActions[index].value as DelayedEvolveInput).evolveHeight <=
      +SmartWeave.block.height
  ) {
    state.foundation.actions[index].status =
      FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS;
    state.evolve = (
      foundationActions[index].value as DelayedEvolveInput
    ).contractSrcTxId;
  } else {
    throw new ContractError('Invalid contract evolution operation.');
  }

  return { state };
};
