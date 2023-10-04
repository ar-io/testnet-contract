import { DEFAULT_UNDERNAME_COUNT, SECONDS_IN_A_YEAR } from '../../constants';
import { tallyNamePurchase, updateDemandFactor } from '../../pricing';
import {
  ArNSName,
  BlockHeight,
  BlockTimestamp,
  ContractResult,
  IOState,
  ReservedName,
} from '../../types';

declare const SmartWeave: any; // TODO: tighter type bindings
declare const ContractError: any; // TODO: tighter type bindings

const tickInternal = (height: BlockHeight, state: IOState): IOState => {
  // const {
  //   records, // has per-height considerations
  //   auctions, // has per-height considerations
  //   reserved, // has per-height considerations by way of timestamps
  //   settings, // MAY NOT HAVE RELEVANCE - just used to pull auction settings
  // } = state;

  let updatedState = state;

  // Update the current demand factor if necessary
  updatedState = updateDemandFactor(height, updatedState);
  updatedState = tickAuctions(height, updatedState);
  return updatedState;
};

function recordHasExpired(
  record: ArNSName,
  currBlockTimestamp: number,
): boolean {
  switch (record.type) {
    case 'permabuy':
      return false;
    case 'lease':
      return +record.endTimestamp < currBlockTimestamp;
  }
}

// Rebuilds the state's records list based on the current block's timestamp and the records' expiration timestamps
function tickRecords(
  currBlockTimestamp: BlockTimestamp,
  state: IOState,
): IOState {
  const tickedRecords = Object.keys(state.records).reduce((acc, key) => {
    const record = state.records[key];
    if (!recordHasExpired(record, currBlockTimestamp.valueOf())) {
      acc[key] = record;
    }
    return acc;
  }, {});
  // update our state
  state.records = tickedRecords;
  return state;
}

function reservationHasExpired(
  reservation: ReservedName,
  currBlockTimestamp: BlockTimestamp,
): boolean {
  return +reservation.endTimestamp < currBlockTimestamp.valueOf();
}

// Removes expired reserved names from the reserved names list
function tickReservedNames(
  currBlockTimestamp: BlockTimestamp,
  state: IOState,
): IOState {
  const activeReservedNames = Object.keys(state.reserved).reduce((acc, key) => {
    const reservedName = state.reserved[key];
    // still active reservation
    if (!reservationHasExpired(reservedName, currBlockTimestamp)) {
      acc[key] = reservedName;
    }
    return acc;
  }, {});

  // update reserved names
  state.reserved = activeReservedNames;
  return state;
}

function tickAuctions(height: BlockHeight, state: IOState): IOState {
  // handle expired auctions
  const activeAuctions = Object.keys(state.auctions).reduce((current, key) => {
    const auction = state.auctions[key];
    const auctionSettings = auction.settings;
    // TODO: This goes away once ID-based settings are removed
    if (!auctionSettings) {
      // ignore bad auctions, we have no way of knowing when it expires
      return current;
    }

    // endHeight represents the height at which the auction is CLOSED and at which bids are no longer accepted
    const endHeight = auction.startHeight + auctionSettings.auctionDuration;

    // still an active auction
    if (endHeight > height.valueOf()) {
      current[key] = auction;
    } else {
      // TODO: Block timestamps is broken here - user could be getting bonus time here when the next write interaction occurs
      // update the records field but do not decrement balance from the initiator as that happens on auction initiation
      const endTimestamp =
        +auction.years * SECONDS_IN_A_YEAR + +SmartWeave.block.timestamp;

      // create the new record object
      const maybeEndTimestamp = (() => {
        switch (auction.type) {
          case 'permabuy':
            return {};
          case 'lease':
            return { endTimestamp };
        }
      })();
      state.records[key] = {
        type: auction.type,
        contractTxId: auction.contractTxId,
        startTimestamp: height.valueOf(),
        undernames: DEFAULT_UNDERNAME_COUNT,
        ...maybeEndTimestamp,
      };

      // TODO: DEAL WITH MUTABILITY OF STATE AND RETURN TYPE HERE
      tallyNamePurchase(new BlockHeight(+SmartWeave.block.height), state);
    }
    // now return the auction object
    return current;
  }, {});
  // update auctions (records was already modified)
  state.auctions = activeAuctions;
  return state;
}

// Removes gateway from the gateway address registry after the leave period completes
export const tick = (state: IOState): ContractResult => {
  const interactionHeight = new BlockHeight(+SmartWeave.block.height);

  if (interactionHeight.valueOf() === state.lastTickedHeight) {
    return { state };
  }

  if (interactionHeight.valueOf() < state.lastTickedHeight) {
    throw new ContractError(
      `Interaction height ${interactionHeight} is less than last ticked height ${state.lastTickedHeight}`,
    );
  }

  // Iterate through each block height between the last ticked state and the interaction height
  let updatedState = state;
  for (
    let tickHeight = state.lastTickedHeight + 1;
    tickHeight <= interactionHeight.valueOf();
    tickHeight++
  ) {
    updatedState = tickInternal(new BlockHeight(tickHeight), updatedState);
  }

  // Now we can tick records and reservations in an aggregate way since they're not dependent on block height directly
  const currentBlockTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);
  updatedState = tickRecords(currentBlockTimestamp, updatedState);
  updatedState = tickReservedNames(currentBlockTimestamp, updatedState);

  return { state: updatedState };
};
