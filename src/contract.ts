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
import { getRecord } from './actions/read/record';
import { buyRecord } from './actions/write/buyRecord';
import { decreaseOperatorStake } from './actions/write/decreaseOperatorStake';
import { evolve } from './actions/write/evolve';
import { evolveState } from './actions/write/evolveState';
import { extendRecord } from './actions/write/extendRecord';
import { increaseOperatorStake } from './actions/write/increaseOperatorStake';
import { increaseUndernameCount } from './actions/write/increaseUndernameCount';
import { joinNetwork } from './actions/write/joinNetwork';
import { leaveNetwork } from './actions/write/leaveNetwork';
import { submitAuctionBid } from './actions/write/submitAuctionBid';
import { tick } from './actions/write/tick';
import { transferTokens } from './actions/write/transferTokens';
import { updateGatewaySettings } from './actions/write/updateGatewaySettings';
import {
  ContractReadResult,
  ContractWriteResult,
  IOContractFunctions,
  IOState,
  PstAction,
} from './types';

export async function handle(
  state: IOState,
  action: PstAction,
): Promise<ContractReadResult | ContractWriteResult> {
  const input = action.input;

  // TODO: on any write interaction, tick state

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
    case 'gatewayTotalStake':
      return getGatewayTotalStake(state, action);
    case 'gatewayRegistry':
      return getGatewayRegistry(state);
    case 'rankedGatewayRegistry':
      return getRankedGatewayRegistry(state);
    case 'joinNetwork':
      return joinNetwork(state, action);
    case 'leaveNetwork':
      return leaveNetwork(state, action);
    case 'increaseOperatorStake':
      return increaseOperatorStake(state, action);
    case 'decreaseOperatorStake':
      return decreaseOperatorStake(state, action);
    case 'updateGatewaySettings':
      return updateGatewaySettings(state, action);
    case 'submitAuctionBid':
      return submitAuctionBid(state, action);
    case 'auction':
      return getAuction(state, action);
    case 'tick':
      return tick(state);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
