import {
  ArNSName,
  ContractResult,
  IOState,
  PstAction,
} from '../../types/types';

declare const ContractError;

export const getRecord = async (
  state: IOState,
  { input: { name } }: PstAction,
): Promise<ContractResult> => {
  const records = state.records;
  const allTiers = state.tiers.history;

  if (typeof name !== 'string') {
    throw new ContractError('Must specify the ArNS Name');
  }

  // Check if the requested name already exists, if not reduce balance and add it
  if (!(name in records)) {
    throw new ContractError('This name does not exist');
  }

  const arnsName: ArNSName = records[name];
  const associatedTier = allTiers.find((t) => t.id === arnsName.tier);

  if (!associatedTier) {
    throw new ContractError('The name is associated with an invalid tier.');
  }

  return {
    result: {
      name,
      ...arnsName,
      tier: {
        ...associatedTier,
      },
    },
  };
};
