// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import { getAuction } from './actions/read/auctions';
import { balance } from './actions/read/balance';
import { getGateway, getGateways } from './actions/read/gateways';
import { getEpoch, getPrescribedObservers } from './actions/read/observers';
import { getPriceForInteraction } from './actions/read/price';
import { getRecord } from './actions/read/record';
// import { buyRecord } from './actions/write/buyRecord';
// import { createReservedName } from './actions/write/createReservedName';
// import { createVault } from './actions/write/createVault';
// import { decreaseDelegateStake } from './actions/write/decreaseDelegateStake';
// import { decreaseOperatorStake } from './actions/write/decreaseOperatorStake';
// import { delegateStake } from './actions/write/delegateStake';
import { evolve } from './actions/write/evolve';
import { evolveState } from './actions/write/evolveState';
// import { extendRecord } from './actions/write/extendRecord';
// import { extendVault } from './actions/write/extendVault';
// import { increaseOperatorStake } from './actions/write/increaseOperatorStake';
// import { increaseUndernameCount } from './actions/write/increaseUndernameCount';
// import { increaseVault } from './actions/write/increaseVault';
// import { joinNetwork } from './actions/write/joinNetwork';
// import { leaveNetwork } from './actions/write/leaveNetwork';
// import { saveObservations } from './actions/write/saveObservations';
// import { submitAuctionBid } from './actions/write/submitAuctionBid';
import { tick } from './actions/write/tick';
// import { transferTokens } from './actions/write/transferTokens';
// import { updateGatewaySettings } from './actions/write/updateGatewaySettings';
// import { vaultedTransfer } from './actions/write/vaultedTransfer';
import {
  ContractReadResult,
  ContractWriteResult,
  IOContractFunctions,
  IOState,
  PstAction,
} from './types';

export const FORKED_AO_BLOCK_HEIGHT = 144900; // approximately July 21, 2024

export const throwForkedError = (blockHeight: number): void => {
  if (blockHeight >= FORKED_AO_BLOCK_HEIGHT) {
    throw new ContractError(
      `This contract is being forked to AO. Write interactions are disabled. Follow along for migration updates: https://twitter.com/ar_io_network`,
    );
  }
};

export async function handle(
  state: IOState,
  action: PstAction,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
): Promise<ContractReadResult | ContractWriteResult> {
  const input = action.input;

  if (SmartWeave.transaction.origin !== 'L1') {
    throw new ContractError('Only L1 transactions are supported.');
  }

  // don't tick on evolutions, it should only update the source code transaction
  if (input.function === 'evolve') {
    return evolve(state, action);
  }

  // TODO: this is an interaction specific for testing and updating state without having to fork the contract, it should be removed for mainnet deployment
  if (input.function === 'evolveState') {
    return evolveState(state, action);
  }

  // all the remaining interactions require a ticked state, even when reading, so users get the most recent evaluation
  const { state: tickedState } = await tick(state);

  const blockHeight = SmartWeave.block.height;

  switch (input.function as IOContractFunctions) {
    // registry read interactions
    case 'gateway':
      return getGateway(tickedState, action);
    case 'gateways':
      return getGateways(tickedState);
    case 'prescribedObservers':
      return getPrescribedObservers(tickedState);
    // case 'delegateStake':
    //   return delegateStake(tickedState, action);
    // case 'decreaseDelegateStake':
    //   return decreaseDelegateStake(tickedState, action);

    // arns read interactions
    case 'record':
      return getRecord(tickedState, action);
    case 'auction':
      return getAuction(tickedState, action);

    // balance read interactions
    case 'balance':
      return balance(tickedState, action);

    // utility read interactions
    case 'epoch':
      return getEpoch(tickedState, action);
    case 'priceForInteraction':
      return getPriceForInteraction(tickedState, action);

    //  owner wallet functions
    // case 'createReservedName':
    //   return createReservedName(tickedState, action);

    // registry write interactions
    // case 'joinNetwork':
    //   throwForkedError(blockHeight);
    //   return joinNetwork(tickedState, action);
    // case 'leaveNetwork':
    //   throwForkedError(blockHeight);
    //   return leaveNetwork(tickedState, action);
    // case 'increaseOperatorStake':
    //   throwForkedError(blockHeight);
    //   return increaseOperatorStake(tickedState, action);
    // case 'decreaseOperatorStake':
    //   throwForkedError(blockHeight);
    //   return decreaseOperatorStake(tickedState, action);
    // case 'updateGatewaySettings':
    //   return updateGatewaySettings(tickedState, action);
    // case 'saveObservations':
    //   return saveObservations(tickedState, action);

    // arns write interactions
    // case 'submitAuctionBid':
    //   return submitAuctionBid(tickedState, action);
    // case 'buyRecord':
    //   return buyRecord(tickedState, action);
    // case 'extendRecord':
    //   return extendRecord(tickedState, action);
    // case 'increaseUndernameCount':
    //   return increaseUndernameCount(tickedState, action);

    // balance write interactions
    // case 'transfer':
    //   return transferTokens(tickedState, action);
    // case 'vaultedTransfer':
    //   return vaultedTransfer(tickedState, action);
    // case 'createVault':
    //   return createVault(tickedState, action);
    // case 'extendVault':
    //   return extendVault(tickedState, action);
    // case 'increaseVault':
    //   return increaseVault(tickedState, action);

    default:
      throwForkedError(blockHeight);
  }
}
