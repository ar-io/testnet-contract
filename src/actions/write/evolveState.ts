import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // evolve auctions
  const { records, auctions } = state;
  const newAuctions = Object.keys(auctions).reduce((acc, key) => {
    const { tier, ...everythingElse } = auctions[key] as any;
    // only keep it if the name isn't in records
    if (!records[key]) {
      acc[key] = everythingElse;
    }
    return acc;
  }, {});

  state.auctions = newAuctions;

  return { state };
};
