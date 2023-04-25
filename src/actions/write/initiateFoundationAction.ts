import {
  FOUNDATION_ACTION_ACTIVE_STATUS,
  MAX_FOUNDATION_ACTION_PERIOD,
  MAX_NOTE_LENGTH,
} from '../../constants';
import {
  ContractResult,
  FoundationAction,
  IOState,
  PstAction,
} from '../../types';
import { isValidArweaveBase64URL } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

// Proposes a foundation action
export const initiateFoundationAction = async (
  state: IOState,
  { caller, input: { type, note, qty, lockLength, value, target } }: PstAction,
): Promise<ContractResult> => {
  const foundation = state.foundation;
  const settings = state.settings;
  let foundationAction: any;

  // The caller must be in the foundation, or else this action cannot be initiated
  if (!foundation.addresses.includes(caller)) {
    throw new ContractError(
      `${caller} Caller needs to be in the foundation wallet list.`,
    );
  }

  if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) {
    throw new ContractError('Note format not recognized.');
  }

  if (target) {
    if (!isValidArweaveBase64URL(target)) {
      throw new ContractError(
        'The target of this action is an invalid Arweave address?"',
      );
    }
  }

  if (type === 'transfer') {
    if (!Number.isInteger(qty) || qty <= 0 || qty > foundation.balance) {
      throw new ContractError(
        'Invalid value for "qty". Must be a positive integer and must not be greater than the total balance available.',
      );
    }
    foundationAction = {
      ...foundationAction,
      qty: qty,
      target: target,
    };
    state.foundation.balance -= qty; // Remove the tokens from the balance
  } else if (type === 'transferLocked') {
    if (!Number.isInteger(qty) || qty <= 0 || qty > foundation.balance) {
      throw new ContractError(
        'Invalid value for "qty". Must be a positive integer and must not be greater than the total balance available.',
      );
    }
    if (lockLength) {
      if (
        !Number.isInteger(lockLength) ||
        lockLength < settings['lockMinLength'] ||
        lockLength > settings['lockMaxLength']
      ) {
        throw new ContractError(
          `lockLength is out of range. lockLength must be between ${settings['lockMinLength']} - ${settings['lockMaxLength']}.`,
        );
      } else {
        foundationAction.lockLength = lockLength;
      }
    } else {
      lockLength = 0;
    }
    foundationAction = {
      ...foundationAction,
      lockLength: lockLength,
      qty: qty,
      target: target,
    };
    state.foundation.balance -= qty; // Remove the tokens from the balance
  } else if (type === 'addAddress') {
    if (foundation.addresses.includes(target)) {
      throw new ContractError(
        'Target is already added as a Foundation address',
      );
    }
    foundationAction = {
      ...foundationAction,
      target: target,
    };
  } else if (type === 'removeAddress') {
    if (!foundation.addresses.includes(target)) {
      throw new ContractError(
        'Target is not in the list of Foundation addresses',
      );
    }
    foundationAction = {
      ...foundationAction,
      target: target,
    };
  } else if (type === 'setMinSignatures' && typeof value === 'number') {
    if (
      !Number.isInteger(value) ||
      value <= 0 ||
      value > foundation.addresses.length
    ) {
      throw new ContractError(
        'Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation.',
      );
    }
    foundationAction = {
      ...foundationAction,
      value: value,
    };
  } else if (type === 'setActionPeriod' && typeof value === 'number') {
    if (
      !Number.isInteger(value) ||
      value <= 0 ||
      value > MAX_FOUNDATION_ACTION_PERIOD
    ) {
      throw new ContractError(
        'Invalid value for transfer period. Must be a positive integer',
      );
    }
    foundationAction = {
      ...foundationAction,
      value: value,
    };
  } else {
    throw new ContractError('Invalid vote type.');
  }

  foundationAction = {
    ...foundationAction,
    id: foundation.actions.length,
    status: FOUNDATION_ACTION_ACTIVE_STATUS,
    type: type,
    note: note,
    signed: [caller],
    start: +SmartWeave.block.height,
  };

  state.foundation.actions.push(foundationAction);
  return { state };
};
