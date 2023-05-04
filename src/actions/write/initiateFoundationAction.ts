import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_INVALID_ID_TIER_MESSAGE,
  DEFAULT_INVALID_TIER_MESSAGE,
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  MAX_ALLOWED_EVOLUTION_DELAY,
  MAX_FOUNDATION_ACTION_PERIOD,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MINIMUM_ALLOWED_EVOLUTION_DELAY,
} from '../../constants';
import {
  ActiveTier,
  ContractEvolutionInput,
  ContractResult,
  FeesInput,
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

  // The caller must be in the foundation, or else this action cannot be initiated
  if (!foundation.addresses.includes(caller)) {
    throw new ContractError(
      `${caller} Caller needs to be in the foundation wallet list.`,
    );
  }

  if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) {
    throw new ContractError('Note format not recognized.');
  }

  switch (type) {
    case 'addAddress':
      if (typeof value === 'string') {
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
      }
      break;
    case 'removeAddress':
      if (typeof value === 'string') {
        if (!foundation.addresses.includes(value)) {
          throw new ContractError(
            'Target is not in the list of Foundation addresses',
          );
        }
      }
      break;
    case 'setMinSignatures':
      if (typeof value === 'number') {
        if (
          !Number.isInteger(value) ||
          value <= 0 ||
          value > foundation.addresses.length
        ) {
          throw new ContractError(
            'Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation.',
          );
        }
      }
      break;
    case 'setActionPeriod':
      if (typeof value === 'number') {
        if (
          !Number.isInteger(value) ||
          value <= 0 ||
          value > MAX_FOUNDATION_ACTION_PERIOD
        ) {
          throw new ContractError(
            'Invalid value for transfer period. Must be a positive integer',
          );
        }
      }
      break;
    case 'setNameFees':
      if (Object.keys(value).length === MAX_NAME_LENGTH) {
        // check validity of fee object
        for (let i = 1; i <= MAX_NAME_LENGTH; i++) {
          if (
            !Number.isInteger(value[i.toString()]) ||
            value[i.toString()] <= 0
          ) {
            throw new ContractError(
              `Invalid value for fee ${i}. Must be an integer greater than 0`,
            );
          }
        }
      } else {
        throw new ContractError(
          `Invalid amount of fees.  Must be less than ${MAX_NAME_LENGTH}`,
        );
      }
      break;
    case 'createNewTier':
      if (!Number.isInteger((value as ServiceTier).fee)) {
        throw new ContractError('Fee must be a valid number.');
      }
      if (!Number.isInteger((value as ServiceTier).settings.maxUndernames)) {
        throw new ContractError('Max undernames must be a valid number.');
      }

      (value as ServiceTier).id = SmartWeave.transaction.id;
      break;
    case 'setActiveTier':
      // check that the tier number is valid
      if (
        !Number.isInteger((value as ActiveTier).tierNumber) ||
        !ALLOWED_ACTIVE_TIERS.includes((value as ActiveTier).tierNumber)
      ) {
        throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
      }
      // the tier must exist in the history before it can be set as an active tier
      if (
        !state.tiers.history.find(
          (tier) => tier.id === (value as ActiveTier).tierId,
        )
      ) {
        throw new ContractError(DEFAULT_INVALID_ID_TIER_MESSAGE);
      }
      break;
    case 'evolveContract':
      if (
        typeof (value as ContractEvolutionInput).contractSrc !== 'string' ||
        !isValidArweaveBase64URL((value as ContractEvolutionInput).contractSrc) // must be a valid arweave transaction ID
      ) {
        throw new ContractError('Invalid contract evolution source code.');
      }
      if ((value as ContractEvolutionInput).blockHeight) {
        if (
          !Number.isInteger((value as ContractEvolutionInput).blockHeight) ||
          (value as ContractEvolutionInput).blockHeight -
            +SmartWeave.block.height <=
            MAX_ALLOWED_EVOLUTION_DELAY ||
          (value as ContractEvolutionInput).blockHeight -
            +SmartWeave.block.height >
            MINIMUM_ALLOWED_EVOLUTION_DELAY
        ) {
          throw new ContractError('Invalid contract evolution block height.');
        } else {
          (value as ContractEvolutionInput).blockHeight =
            +SmartWeave.block.height + MINIMUM_ALLOWED_EVOLUTION_DELAY;
        }
      }
      break;
    default:
      throw new ContractError('Invalid action parameters.');
  }

  const foundationAction: FoundationAction = {
    id: foundation.actions.length,
    status: FOUNDATION_ACTION_ACTIVE_STATUS,
    type,
    note,
    signed: [caller],
    start: +SmartWeave.block.height,
    value,
  };
  state.foundation.actions.push(foundationAction);

  // If this user is the one and only signer, this action should be completed
  if (state.foundation.minSignatures === 1) {
    switch (type) {
      case 'addAddress':
        // Add the new address to the multi sig
        state.foundation.addresses.push(value.toString());
        break;
      case 'removeAddress':
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
      default:
        break;
    }
    state.foundation.actions[foundationAction.id].status =
      FOUNDATION_ACTION_PASSED_STATUS;
  }

  return { state };
};
