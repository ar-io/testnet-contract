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
import { getPriceForInteraction } from './actions/read/price';
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
import { saveObservations } from './actions/write/saveObservations';
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

  // tick state on any interaction, even when reading, so users get the most recent evaluation
  const { state: tickedState } = await tick(state);

  switch (input.function as IOContractFunctions) {
    case 'transfer':
      return transferTokens(tickedState, action);
    case 'buyRecord':
      return buyRecord(tickedState, action);
    case 'extendRecord':
      return extendRecord(tickedState, action);
    case 'increaseUndernameCount':
      return increaseUndernameCount(tickedState, action);
    case 'evolve':
      return evolve(tickedState, action);
    case 'evolveState':
      return evolveState(tickedState, action);
    case 'balance':
      return balance(tickedState, action);
    case 'record':
      return getRecord(tickedState, action);
    case 'gateway':
      return getGateway(tickedState, action);
    case 'prescribedObserver':
      return prescribedObserver(tickedState, action);
    case 'prescribedObservers':
      return prescribedObservers(tickedState, action);
    case 'gatewayTotalStake':
      return getGatewayTotalStake(tickedState, action);
    case 'gatewayRegistry':
      return getGatewayRegistry(tickedState);
    case 'rankedGatewayRegistry':
      return getRankedGatewayRegistry(tickedState);
    case 'joinNetwork':
      return joinNetwork(tickedState, action);
    case 'leaveNetwork':
      return leaveNetwork(tickedState, action);
    case 'increaseOperatorStake':
      return increaseOperatorStake(tickedState, action);
    case 'decreaseOperatorStake':
      return decreaseOperatorStake(tickedState, action);
    case 'updateGatewaySettings':
      return updateGatewaySettings(tickedState, action);
    case 'submitAuctionBid':
      return submitAuctionBid(tickedState, action);
    case 'auction':
      return getAuction(tickedState, action);
    case 'saveObservations':
      return saveObservations(tickedState, action);
    case 'priceForInteraction':
      return getPriceForInteraction(tickedState, action);
    case 'tick':
      return tick(tickedState);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
