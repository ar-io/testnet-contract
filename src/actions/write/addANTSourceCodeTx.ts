import {
  DEFAULT_EXISTING_ANT_SOURCE_CODE_TX_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
  TX_ID_LENGTH,
} from '../../constants';

import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

// Modifies the fees for purchasing ArNS names
export const addANTSourceCodeTx = async (
  state: IOState,
  { caller, input: { contractTxId } }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;
  const approvedANTSourceCodeTxs = state.approvedANTSourceCodeTxs;

  // Only the owner of the contract can perform this method
  if (caller !== owner) {
    throw new ContractError(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
  }

  // check if it is a valid arweave transaction id for the smartweave contract
  const txIdPattern = new RegExp('^[a-zA-Z0-9_-]{43}$');
  const txIdres = txIdPattern.test(contractTxId);
  if (
    typeof contractTxId !== 'string' ||
    contractTxId.length !== TX_ID_LENGTH ||
    !txIdres
  ) {
    throw new ContractError('Invalid ANT Source Code Transaction ID');
  }

  if (approvedANTSourceCodeTxs.indexOf(contractTxId) > -1) {
    throw new ContractError(DEFAULT_EXISTING_ANT_SOURCE_CODE_TX_MESSAGE);
  } else {
    state.approvedANTSourceCodeTxs.push(contractTxId);
  }

  return { state };
};
