import { ContractResult, IOState, PstAction, ServiceTier } from '../../types';

declare const ContractError;

export const getTier = async (
  state: IOState,
  { input: { id } }: PstAction,
): Promise<ContractResult & any> => {
  const { tiers: { history: allTiers }} = state;

  // the tier object requested
  const tierDetails: ServiceTier = allTiers.find(
    (t) => t.id === id,
  );

  if (!tierDetails) {
    throw new ContractError('Tier was not published to state. Try again.');
  }

  return {
    result: {
      ...tierDetails,
    },
  };
};

export const getActiveTiers = async (
  state: IOState,
): Promise<ContractResult & any> => {
  const { tiers: { current: currentTiers, history: allTiers }} = state;


  const activeTiers = currentTiers.map(([tier, id]) => {
    const tierObj = allTiers.find((t) => t.id === id);
    return {
      tier,
      ...tierObj,
    };
  });

  return {
    result: activeTiers,
  };
};
