// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import {
  balance,
  buyRecord,
  evolve,
  evolveState,
  extendRecord,
  finalizeLeave,
  finalizeOperatorStakeDecrease,
  foundationAction,
  getAuction,
  getGateway,
  getGatewayRegistry,
  getGatewayTotalStake,
  getRankedGatewayRegistry,
  getRecord,
  increaseOperatorStake,
  increaseUndernameCount,
  initiateLeave,
  initiateOperatorStakeDecrease,
  joinNetwork,
  submitAuctionBid,
  transferTokens,
  updateGatewaySettings,
} from './actions';
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
    case 'foundationAction':
      return foundationAction(state, action);
    case 'submitAuctionBid':
      return submitAuctionBid(state, action);
    case 'getAuction':
      return getAuction(state, action);
    default:
      throw new ContractError(
        `No function supplied or function not recognized: "${input.function}"`,
      );
  }
}
