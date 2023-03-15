// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import { getBalance } from './actions/read/balance';
import { getRecord } from './actions/read/record';
import { getActiveTiers, getTier } from './actions/read/tiers';
import { addANTSourceCodeTx } from './actions/write/addANTSourceCodeTx';
import { buyRecord } from './actions/write/buyRecord';
import { createNewTier } from './actions/write/createNewTier.js';
import { evolve } from './actions/write/evolve';
import { extendRecord } from './actions/write/extendRecord.js';
import { fixState } from './actions/write/fixState';
import { mintTokens } from './actions/write/mintTokens';
import { removeANTSourceCodeTx } from './actions/write/removeANTSourceCodeTx';
import { removeRecord } from './actions/write/removeRecord';
import { setActiveTier } from './actions/write/setActiveTier';
import { setFees } from './actions/write/setFees';
import { setName } from './actions/write/setName';
import { transferTokens } from './actions/write/transferTokens';
import { upgradeTier } from './actions/write/upgradeTier';
import { ContractResult, IOState, PstAction, PstFunction } from './types/types';

declare const ContractError;

export async function handle(
  state: IOState,
  action: PstAction,
): Promise<ContractResult> {
  const input = action.input;

  switch (input.function as PstFunction) {
    case 'transfer':
      return await transferTokens(state, action);
    case 'mint':
      return await mintTokens(state, action);
    case 'setFees':
      return await setFees(state, action);
    case 'buyRecord':
      return await buyRecord(state, action);
    case 'extendRecord':
      return await extendRecord(state, action);
    case 'removeRecord':
      return await removeRecord(state, action);
    case 'setActiveTier':
      return await setActiveTier(state, action);
    case 'evolve':
      return await evolve(state, action);
    case 'fixState':
      return await fixState(state, action);
    case 'setName':
      return await setName(state, action);
    case 'addANTSourceCodeTx':
      return await addANTSourceCodeTx(state, action);
    case 'removeANTSourceCodeTx':
      return await removeANTSourceCodeTx(state, action);
    case 'getBalance':
      return await getBalance(state, action);
    case 'getRecord':
      return await getRecord(state, action);
    case 'getTier':
      return await getTier(state, action);
    case 'getActiveTiers':
      return await getActiveTiers(state);
    case 'upgradeTier':
      return await upgradeTier(state, action);
    case 'createNewTier':
      return await createNewTier(state, action);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
