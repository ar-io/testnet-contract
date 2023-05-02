import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_INVALID_ID_TIER_MESSAGE,
  DEFAULT_INVALID_TIER_MESSAGE,
  FOUNDATION_ACTION_ACTIVE_STATUS,
  MAX_FOUNDATION_ACTION_PERIOD,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
} from '../../constants';
import {
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
  {
    caller,
    input: {
      type,
      note,
      value,
      target,
      fees,
      activeTierNumber,
      activeTierId,
      newTierFee,
      newTierSettings,
    },
  }: PstAction,
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

  if (target) {
    if (!isValidArweaveBase64URL(target)) {
      throw new ContractError(
        'The target of this action is an invalid Arweave address?"',
      );
    }
  }

  if (type === 'addAddress') {
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
  } else if (
    type === 'setNameFees' &&
    Object.keys(fees).length === MAX_NAME_LENGTH
  ) {
    // check validity of fee object
    for (let i = 1; i <= MAX_NAME_LENGTH; i++) {
      if (!Number.isInteger(fees[i.toString()]) || fees[i.toString()] <= 0) {
        throw new ContractError(
          `Invalid value for fee ${i}. Must be an integer greater than 0`,
        );
      }
    }
    foundationAction = {
      ...foundationAction,
      fees: fees,
    };
  } else if (type === 'createNewTier') {
    if (!Number.isInteger(newTierFee)) {
      throw new ContractError('Fee must be a valid number.');
    }
    // TODO: additional validation on tier settings
    const newTier: ServiceTier = {
      id: SmartWeave.transaction.id,
      fee: newTierFee,
      settings: newTierSettings,
    };
    foundationAction = {
      ...foundationAction,
      newTier,
    };
  } else if (type === 'setActiveTier') {
    if (
      !Number.isInteger(activeTierNumber) ||
      !ALLOWED_ACTIVE_TIERS.includes(activeTierNumber)
    ) {
      throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
    }

    // the tier must exist in the history before it can be set as an active tier
    const history = state.tiers.history;
    const existingTier = history.find((tier) => tier.id === activeTierId);

    if (!existingTier) {
      throw new ContractError(DEFAULT_INVALID_ID_TIER_MESSAGE);
    }

    foundationAction = {
      ...foundationAction,
      activeTierNumber,
      activeTierId,
    };
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
  };

  state.foundation.actions.push(foundationAction);

  // TO DO
  // If this user is the one and only signer, this action should be completed
  return { state };
};
