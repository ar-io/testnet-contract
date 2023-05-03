import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_INVALID_ID_TIER_MESSAGE,
  DEFAULT_INVALID_TIER_MESSAGE,
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  MAX_FOUNDATION_ACTION_PERIOD,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
} from '../../constants';
import {
  ActiveTier,
  ContractResult,
  FoundationAction,
  IOState,
  PstAction,
  ServiceTier,
} from '../../types';
import { isValidArweaveBase64URL } from '../../utilities';

declare const ContractError;
declare const SmartWeave: any;

// Proposes a foundation action
export const initiateFoundationAction = async (
  state: IOState,
  { caller, input: { type, note, value } }: PstAction,
): Promise<ContractResult> => {
  const foundation = state.foundation;
  let foundationAction: FoundationAction;

  // The caller must be in the foundation, or else this action cannot be initiated
  if (!foundation.addresses.includes(caller)) {
    throw new ContractError(
      `${caller} Caller needs to be in the foundation wallet list.`,
    );
  }

  if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) {
    throw new ContractError('Note format not recognized.');
  }

  if (type === 'addAddress' && typeof value === 'string') {
    if (!isValidArweaveBase64URL(value)) {
      throw new ContractError(
        'The target of this action is an invalid Arweave address?"',
      );
    }
    if (foundation.addresses.includes(value)) {
      throw new ContractError(
        'Target is already added as a Foundation address',
      );
    }
  } else if (type === 'removeAddress' && typeof value === 'string') {
    if (!foundation.addresses.includes(value)) {
      throw new ContractError(
        'Target is not in the list of Foundation addresses',
      );
    }
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
  } else if (
    type === 'setNameFees' &&
    Object.keys(value).length === MAX_NAME_LENGTH
  ) {
    // check validity of fee object
    for (let i = 1; i <= MAX_NAME_LENGTH; i++) {
      if (!Number.isInteger(value[i.toString()]) || value[i.toString()] <= 0) {
        throw new ContractError(
          `Invalid value for fee ${i}. Must be an integer greater than 0`,
        );
      }
    }
  } else if (type === 'createNewTier') {
    let newTier = value as ServiceTier;
    if (!Number.isInteger(newTier.fee)) {
      throw new ContractError('Fee must be a valid number.');
    }
    // TODO: additional validation on tier settings
    newTier.id = SmartWeave.transaction.id;
    value = newTier;
  } else if (type === 'setActiveTier') {
    let activeTier = value as ActiveTier;
    if (
      !Number.isInteger(activeTier.tierNumber) ||
      !ALLOWED_ACTIVE_TIERS.includes(activeTier.tierNumber)
    ) {
      throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
    }

    // the tier must exist in the history before it can be set as an active tier
    const history = state.tiers.history;
    const existingTier = history.find((tier) => tier.id === activeTier.tierId);
    if (!existingTier) {
      throw new ContractError(DEFAULT_INVALID_ID_TIER_MESSAGE);
    }
  } else {
    throw new ContractError('Invalid action parameters.');
  }

  foundationAction = {
    ...foundationAction,
    id: foundation.actions.length,
    status: FOUNDATION_ACTION_ACTIVE_STATUS,
    type: type,
    note: note,
    signed: [caller],
    start: +SmartWeave.block.height,
    value,
  };

  state.foundation.actions.push(foundationAction);

  // If this user is the one and only signer, this action should be completed
  if (state.foundation.minSignatures === 1) {
    if (type === 'addAddress') {
      // Add the new address to the multi sig
      state.foundation.addresses.push(foundationAction.value.toString());
    } else if (type === 'removeAddress') {
      // Find the index of the existing foundation address and remove it
      const index = foundation.addresses.indexOf(
        foundationAction.value.toString(),
      );
      state.foundation.addresses.splice(index, 1);
    } else if (type === 'setMinSignatures') {
      state.foundation.minSignatures = +foundationAction.value;
    } else if (type === 'setActionPeriod') {
      state.foundation.actionPeriod = +foundationAction.value;
    } else if (type === 'setNameFees') {
      const fees = foundationAction.value as {
        [nameLength: string]: number;
      };
      state.fees = fees;
    } else if (type === 'createNewTier') {
      const newTier = foundationAction.value as ServiceTier;
      state.tiers.history.push(newTier);
    } else if (type === 'setActiveTier') {
      const activeTier = foundationAction.value as ActiveTier;
      state.tiers.current[activeTier.tierNumber] = activeTier.tierId;
    }
    state.foundation.actions[foundationAction.id].status =
      FOUNDATION_ACTION_PASSED_STATUS;
  }
  return { state };
};
