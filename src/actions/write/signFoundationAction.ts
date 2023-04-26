import {
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

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
  // If this vote is not active, then do nothing
  if (action.status !== FOUNDATION_ACTION_ACTIVE_STATUS) {
    throw new ContractError('This action is not active.');
  }

  //If this vote is active, but is outside of the action period and has not received all signatures, then this approval does not count and mark the action as failed
  if (
    +SmartWeave.block.height >= action.start + foundation.actionPeriod &&
    action.status === FOUNDATION_ACTION_ACTIVE_STATUS &&
    action.signed.length < foundation.minSignatures
  ) {
    if (type === 'transfer' || type === 'transferLocked') {
      // return the qty back to the foundation
      state.foundation.balance += state.foundation.actions[id].qty;
    }
    state.foundation.actions[id].status = FOUNDATION_ACTION_FAILED_STATUS; // this vote has not completed within the action period
    return { state };
  }

  // the caller must not have already signed this transaction
  if (!action.signed.includes(caller)) {
    // This is a valid active action, so increase signatures
    state.foundation.actions[id].signed.push(caller);
  }

  // If there are enough signatures to complete the transaction, then it is executed
  if (state.foundation.actions[id].signed.length >= foundation.minSignatures) {
    if (type === 'transfer') {
      const target = state.foundation.actions[id].target;
      const qty = state.foundation.actions[id].qty;
      if (target in state.balances) {
        state.balances[target] += qty;
      } else {
        state.balances[target] = qty;
      }
      state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
    } else if (type === 'transferLocked') {
      const target = state.foundation.actions[id].target;
      const qty = state.foundation.actions[id].qty;
      const lockLength = state.foundation.actions[id].lockLength;
      const start = +SmartWeave.block.height;
      let end = lockLength;
      if (end !== 0) {
        end = start + lockLength;
      }
      if (target in state.vaults) {
        state.vaults[target].push({
          balance: qty,
          end,
          start,
        });
      } else {
        state.vaults[target] = [
          {
            balance: qty,
            end,
            start,
          },
        ];
      }

      state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
    } else if (type === 'addAddress') {
      if (foundation.addresses.includes(state.foundation.actions[id].target)) {
        throw new ContractError(
          'Target is already added as a Foundation address',
        );
      }
      // Add the new address
      state.foundation.addresses.push(state.foundation.actions[id].target);
      state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
    } else if (type === 'removeAddress') {
      if (!foundation.addresses.includes(state.foundation.actions[id].target)) {
        throw new ContractError(
          'Target is not in the list of Foundation addresses',
        );
      }
      // Find the index of the existing foundation address and remove it
      const index = foundation.addresses.indexOf(
        state.foundation.actions[id].target,
      );
      state.foundation.addresses.splice(index, 1);
      state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
    } else if (type === 'setMinSignatures') {
      const value = +state.foundation.actions[id].value;
      state.foundation.minSignatures = value;
      state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
    } else if (state.foundation.actions[id].type === 'setActionPeriod') {
      const value = state.foundation.actions[id].value;
      state.foundation.actionPeriod = +value;
      state.foundation.actions[id].status = FOUNDATION_ACTION_PASSED_STATUS;
    } else {
      throw new ContractError('Invalid vote type.');
    }
  } else {
    throw new ContractError(
      'Caller has already approved this action and it is not ready to be finalized yet.',
    );
  }
  return { state };
};
