// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import { getBalance } from './actions/read/balance';
import {
  getGateway,
  getGatewayRegistry,
  getGatewayTotalStake,
  getRankedGatewayRegistry,
} from './actions/read/gateways';
import { getRecord } from './actions/read/record';
import { getActiveTiers, getTier } from './actions/read/tiers';
import { addANTSourceCodeTx } from './actions/write/addANTSourceCodeTx';
import { buyRecord } from './actions/write/buyRecord';
import { createNewTier } from './actions/write/createNewTier.js';
import { evolve } from './actions/write/evolve';
import { extendRecord } from './actions/write/extendRecord.js';
import { finalizeLeave } from './actions/write/finalizeLeave';
import { finalizeOperatorStakeDecrease } from './actions/write/finalizeOperatorStakeDecrease';
import { increaseOperatorStake } from './actions/write/increaseOperatorStake';
import { initiateFoundationAction } from './actions/write/initiateFoundationAction';
import { initiateLeave } from './actions/write/initiateLeave';
import { initiateOperatorStakeDecrease } from './actions/write/initiateOperatorStakeDecrease';
import { joinNetwork } from './actions/write/joinNetwork';
import { removeANTSourceCodeTx } from './actions/write/removeANTSourceCodeTx';
import { removeRecord } from './actions/write/removeRecord';
import { setActiveTier } from './actions/write/setActiveTier';
import { signFoundationAction } from './actions/write/signFoundationAction';
import { transferTokens } from './actions/write/transferTokens';
import { updateGatewaySettings } from './actions/write/updateGatewaySettings';
import { updateState } from './actions/write/updateState';
import { upgradeTier } from './actions/write/upgradeTier';
import {
  ContractResult,
  IOContractFunctions,
  IOState,
  PstAction,
} from './types';

declare const ContractError;

export async function handle(
  state: IOState,
  action: PstAction,
): Promise<ContractResult> {
  const input = action.input;

  switch (input.function as IOContractFunctions) {
    case 'transfer':
      return await transferTokens(state, action);
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
    case 'updateState':
      return await updateState(state, action);
    case 'addANTSourceCodeTx':
      return await addANTSourceCodeTx(state, action);
    case 'removeANTSourceCodeTx':
      return await removeANTSourceCodeTx(state, action);
    case 'balance':
      return await getBalance(state, action);
    case 'record':
      return await getRecord(state, action);
    case 'tier':
      return await getTier(state, action);
    case 'activeTiers':
      return await getActiveTiers(state);
    case 'gateway':
      return await getGateway(state, action);
    case 'gatewayTotalStake':
      return await getGatewayTotalStake(state, action);
    case 'gatewayRegistry':
      return await getGatewayRegistry(state);
    case 'rankedGatewayRegistry':
      return await getRankedGatewayRegistry(state);
    case 'upgradeTier':
      return await upgradeTier(state, action);
    case 'createNewTier':
      return await createNewTier(state, action);
    case 'joinNetwork':
      return await joinNetwork(state, action);
    case 'initiateLeave':
      return await initiateLeave(state, action);
    case 'finalizeLeave':
      return await finalizeLeave(state, action);
    case 'increaseOperatorStake':
      return await increaseOperatorStake(state, action);
    case 'initiateOperatorStakeDecrease':
      return await initiateOperatorStakeDecrease(state, action);
    case 'finalizeOperatorStakeDecrease':
      return await finalizeOperatorStakeDecrease(state, action);
    case 'updateGatewaySettings':
      return await updateGatewaySettings(state, action);
    case 'initiateFoundationAction':
      return await initiateFoundationAction(state, action);
    case 'signFoundationAction':
      return await signFoundationAction(state, action);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
