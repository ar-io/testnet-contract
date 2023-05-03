import {
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
} from '../../constants';
import {
  ActiveTier,
  ContractResult,
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
  if (state.foundation.actions[id].signed.length >= foundation.minSignatures) {
    if (type === 'addAddress') {
      const addressToAdd = state.foundation.actions[id].value.toString();
      if (foundation.addresses.includes(addressToAdd)) {
        throw new ContractError(
          'Target is already added as a Foundation address',
        );
      }
      // Add the new address
      state.foundation.addresses.push(addressToAdd);
    } else if (type === 'removeAddress') {
      const addressToRemove = state.foundation.actions[id].value.toString();
      if (!foundation.addresses.includes(addressToRemove)) {
        throw new ContractError(
          'Target is not in the list of Foundation addresses',
        );
      }
      // Find the index of the existing foundation address and remove it
      const index = foundation.addresses.indexOf(addressToRemove);
      state.foundation.addresses.splice(index, 1);
    } else if (type === 'setMinSignatures') {
      state.foundation.minSignatures = +state.foundation.actions[id].value;
    } else if (state.foundation.actions[id].type === 'setActionPeriod') {
      state.foundation.actionPeriod = +state.foundation.actions[id].value;
    } else if (state.foundation.actions[id].type === 'setNameFees') {
      state.fees = state.foundation.actions[id].value as {
        [nameLength: string]: number;
      };
    } else if (state.foundation.actions[id].type === 'createNewTier') {
      state.tiers.history.push(
        state.foundation.actions[id].value as ServiceTier,
      );
    } else if (state.foundation.actions[id].type === 'setActiveTier') {
      const activeTier = state.foundation.actions[id].value as ActiveTier;
      state.tiers.current[activeTier.tierNumber] = activeTier.tierId;
    } else {
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
