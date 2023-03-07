// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import { balance } from './actions/read/balance';
import { record } from './actions/read/record';
import { addANTSourceCodeTx } from './actions/write/addANTSourceCodeTx';
import { buyRecord } from './actions/write/buyRecord';
import { evolve } from './actions/write/evolve';
import { extendRecord } from './actions/write/extendRecord.js';
import { fixState } from './actions/write/fixState';
import { mintTokens } from './actions/write/mintTokens';
import { removeANTSourceCodeTx } from './actions/write/removeANTSourceCodeTx';
import { removeRecord } from './actions/write/removeRecord';
import { setFees } from './actions/write/setFees';
import { setName } from './actions/write/setName';
import { setTier } from './actions/write/setTier';
import { transferTokens } from './actions/write/transferTokens';
import { upgradeTier } from './actions/write/upgradeTier';
import { ContractResult, IOState, PstAction } from './types/types';

declare const ContractError;

export async function handle(
  state: IOState,
  action: PstAction,
): Promise<ContractResult> {
  const input = action.input;

  switch (input.function) {
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
    case 'upgradeTier':
      return await upgradeTier(state, action);
    case 'setTier':
      return await setTier(state, action);
    case 'removeRecord':
      return await removeRecord(state, action);
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
    case 'balance':
      return await balance(state, action);
    case 'record':
      return await record(state, action);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
