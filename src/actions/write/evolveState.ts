import {
  DEFAULT_UNDERNAME_COUNT,
  NON_CONTRACT_OWNER_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // expires in one year
  state.records['bark'] = {
    contractTxId: 'uxYtKoLadnS-MH1AZ2ORhDNH5vJIbvjSWvXa6QLjzVg',
    startTimestamp: +SmartWeave.block.timestamp,
    endTimestamp: +SmartWeave.block.timestamp + SECONDS_IN_A_YEAR,
    undernames: DEFAULT_UNDERNAME_COUNT,
    type: 'lease',
    purchasePrice: 0,
  };

  return { state };
};
