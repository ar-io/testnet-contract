// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import { getAuction } from './actions/read/auction';
import { balance } from './actions/read/balance';
import {
  getGateway,
  getGatewayRegistry,
  getGatewayTotalStake,
  getRankedGatewayRegistry,
} from './actions/read/gateways';
import {
  prescribedObserver,
  prescribedObservers,
} from './actions/read/observation';
import { getRecord } from './actions/read/record';
import { buyRecord } from './actions/write/buyRecord';
import { evolve } from './actions/write/evolve';
import { evolveState } from './actions/write/evolveState';
import { extendRecord } from './actions/write/extendRecord';
import { finalizeLeave } from './actions/write/finalizeLeave';
import { finalizeOperatorStakeDecrease } from './actions/write/finalizeOperatorStakeDecrease';
import { increaseOperatorStake } from './actions/write/increaseOperatorStake';
import { increaseUndernameCount } from './actions/write/increaseUndernameCount';
import { initiateLeave } from './actions/write/initiateLeave';
import { initiateOperatorStakeDecrease } from './actions/write/initiateOperatorStakeDecrease';
import { joinNetwork } from './actions/write/joinNetwork';
import { saveObservations } from './actions/write/saveObservations';
import { submitAuctionBid } from './actions/write/submitAuctionBid';
import { transferTokens } from './actions/write/transferTokens';
import { updateGatewaySettings } from './actions/write/updateGatewaySettings';
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
      return transferTokens(state, action);
    case 'buyRecord':
      return buyRecord(state, action);
    case 'extendRecord':
      return extendRecord(state, action);
    case 'increaseUndernameCount':
      return increaseUndernameCount(state, action);
    case 'evolve':
      return evolve(state, action);
    case 'evolveState':
      return evolveState(state, action);
    case 'balance':
      return balance(state, action);
    case 'record':
      return getRecord(state, action);
    case 'gateway':
      return getGateway(state, action);
    case 'prescribedObserver':
      return prescribedObserver(state, action);
    case 'prescribedObservers':
      return prescribedObservers(state, action);
    case 'gatewayTotalStake':
      return getGatewayTotalStake(state, action);
    case 'gatewayRegistry':
      return getGatewayRegistry(state);
    case 'rankedGatewayRegistry':
      return getRankedGatewayRegistry(state);
    case 'joinNetwork':
      return joinNetwork(state, action);
    case 'initiateLeave':
      return initiateLeave(state, action);
    case 'finalizeLeave':
      return finalizeLeave(state, action);
    case 'increaseOperatorStake':
      return increaseOperatorStake(state, action);
    case 'initiateOperatorStakeDecrease':
      return initiateOperatorStakeDecrease(state, action);
    case 'finalizeOperatorStakeDecrease':
      return finalizeOperatorStakeDecrease(state, action);
    case 'updateGatewaySettings':
      return updateGatewaySettings(state, action);
    case 'submitAuctionBid':
      return submitAuctionBid(state, action);
    case 'auction':
      return getAuction(state, action);
    case 'saveObservations':
      return saveObservations(state, action);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
