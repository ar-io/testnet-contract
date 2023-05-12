import {
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS,
} from '../../constants';
import {
  ContractResult,
  DelayedEvolveInput,
  FoundationAction,
  IOState,
  PstAction,
} from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Updates this contract to new source code
export const evolve = async (
  state: IOState,
  { input }: PstAction,
): Promise<ContractResult> => {
  const foundationActions = state.foundation?.actions ?? [];
  const actionId = input.value as string;
  const action: FoundationAction = foundationActions.find(
    (action) => action.id === actionId,
  );
  const actionIndex = foundationActions.indexOf(action);

  // There are no caller checks, as anyone can invoke the evolutiona as long as conditions are met
  if (
    action &&
    action.type === 'delayedEvolve' &&
    action.status === FOUNDATION_ACTION_PASSED_STATUS &&
    (action.value as DelayedEvolveInput).evolveHeight <=
      +SmartWeave.block.height
  ) {
    state.foundation.actions[actionIndex].status =
      FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS;
    state.evolve = (
      foundationActions[actionIndex].value as DelayedEvolveInput
    ).contractSrcTxId;
  } else {
    throw new ContractError('Invalid contract evolution operation.');
  }

  return { state };
};
