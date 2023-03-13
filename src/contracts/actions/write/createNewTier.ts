import { uuidV4 } from 'uuid';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

export const createNewTier = async (
  state: IOState,
  {
    caller,
    input: {
      newTier: { fee, settings },
    },
  }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  // Check if the user has enough tokens to purchase the name
  if (caller !== owner) {
    throw new ContractError(`Caller is not the owner of the ArNS!`);
  }

  if (!Number.isInteger(fee)) {
    throw new ContractError('Fee must be a valid number.');
  }

  // TODO: additional validation on tier settings
  const newTier = {
    id: uuidV4(),
    fee,
    settings,
  };

  // push the new tier
  state.tiers.history.push(newTier);

  return { state };
};
