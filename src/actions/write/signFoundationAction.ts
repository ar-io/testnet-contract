import {
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
} from '../../constants';
import {
  ActiveTier,
  ContractResult,
  FeesInput,
  IOState,
  PstAction,
  ServiceTier,
} from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Signals an approval for a proposed foundation action
export const signFoundationAction = async (
  state: IOState,
  { caller, input: { id } }: PstAction,
): Promise<ContractResult> => {
  const foundation = state.foundation;

  if (!Number.isInteger(id)) {
    throw new ContractError('Invalid value for "id". Must be an integer.');
  }

  // The caller must be in the foundation, or else this action cannot be approved
  if (!foundation.addresses.includes(caller)) {
    throw new ContractError(
      'Caller needs to be in the foundation wallet list.',
    );
  }

  const action = foundation.actions[id];
  const type = state.foundation.actions[id].type;
  // If this vote is not active, then exit
  if (action.status !== FOUNDATION_ACTION_ACTIVE_STATUS) {
    throw new ContractError('This action is not active.');
  }

  //If this vote is active, but is outside of the action period and has not received all signatures, then this approval does not count and mark the action as failed
  if (
    +SmartWeave.block.height >= action.start + foundation.actionPeriod &&
    action.status === FOUNDATION_ACTION_ACTIVE_STATUS &&
    action.signed.length < foundation.minSignatures
  ) {
    state.foundation.actions[id].status = FOUNDATION_ACTION_FAILED_STATUS; // this vote has not completed within the action period
    return { state };
  }

  // If this caller has not signed this action yet, then it is signed
  if (!action.signed.includes(caller)) {
    state.foundation.actions[id].signed.push(caller);
  }

  // If there are enough signatures to complete the transaction, then it is executed
  const value = state.foundation.actions[id].value;
  if (state.foundation.actions[id].signed.length >= foundation.minSignatures) {
    switch (type) {
      case 'addAddress':
        if (foundation.addresses.includes(value.toString())) {
          throw new ContractError(
            'Target is already added as a Foundation address',
          );
        }
        // Add the new address
        state.foundation.addresses.push(value.toString());
        break;
      case 'removeAddress':
        if (!foundation.addresses.includes(value.toString())) {
          throw new ContractError(
            'Target is not in the list of Foundation addresses',
          );
        }
        // Find the index of the existing foundation address and remove it
        state.foundation.addresses.splice(
          foundation.addresses.indexOf(value.toString()),
          1,
        );
        break;
      case 'setMinSignatures':
        state.foundation.minSignatures = +value;
        break;
      case 'setActionPeriod':
        state.foundation.actionPeriod = +value;
        break;
      case 'setNameFees':
        state.fees = value as FeesInput;
        break;
      case 'createNewTier':
        state.tiers.history.push(value as ServiceTier);
        break;
      case 'setActiveTier':
        state.tiers.current[(value as ActiveTier).tierNumber] = (
          value as ActiveTier
        ).tierId;
        break;
      case 'delayedEvolve':
        // there is no action taken as the evolve method must be run
        break;
      default:
        throw new ContractError('Invalid vote type.');
    }
    state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
  } else {
    throw new ContractError(
      'Caller has already approved this action but it still requires more signatures.',
    );
  }
  return { state };
};
