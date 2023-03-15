import {
  ContractResult,
  IOState,
  PstAction,
  ServiceTier,
} from '../../types/types';

declare const ContractError;

export const getTier = async (
  state: IOState,
  { input: { tierNumber } }: PstAction,
): Promise<ContractResult & any> => {
  const tiers = state.tiers;
  const currentTiers = tiers.current;
  const validTiers = tiers.history;

  if (
    !Number.isInteger(tierNumber) ||
    !Object.keys(currentTiers)
      .map((k) => +k)
      .includes(tierNumber)
  ) {
    throw new ContractError(
      `Invalid tier selected. Available options ${Object.keys(currentTiers)}`,
    );
  }

  // the tier object requested
  const selectedTiter: ServiceTier = validTiers.find(
    (t) => t.id === currentTiers[tierNumber],
  );

  if (!selectedTiter) {
    throw new ContractError('Tier was not published to state. Try again.');
  }

  return {
    result: {
      ...selectedTiter,
    },
  };
};

export const getActiveTiers = async (
  state: IOState,
): Promise<ContractResult & any> => {
  const tiers = state.tiers;
  const current = tiers.current;
  const allTiers = tiers.history;

  const activeTiers = Object.entries(current).map(([tier, id]) => {
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
