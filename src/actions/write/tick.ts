import { DEFAULT_UNDERNAME_COUNT, SECONDS_IN_A_YEAR } from '../../constants';
import { ContractResult, IOState } from '../../types';

declare const SmartWeave: any;

// Removes gateway from the gateway address registry after the leave period completes
export const tick = async (state: IOState): Promise<ContractResult> => {
  const { records, auctions, reserved } = state;

  // TODO: do we give the caller a tip?

  // remove any expired records
  const activeRecords = Object.keys(records).reduce((current, key) => {
    const record = records[key];
    if (
      (record.type === 'lease' &&
        +record.endTimestamp > +SmartWeave.block.timestamp) ||
      record.type === 'permabuy'
    ) {
      current[key] = record;
    }
    return current;
  }, {});

  state.records = activeRecords;

  // handle any expired reserved names that have not been claimed
  const activeReservedNames = Object.keys(reserved).reduce((current, key) => {
    const reservedName = reserved[key];
    // still active reservation
    if (
      reservedName.endTimestamp &&
      +reservedName.endTimestamp > +SmartWeave.block.timestamp
    ) {
      current[key] = reservedName;
    }
    return current;
  }, {});

  state.reserved = activeReservedNames;

  // handle expired auctions
  const activeAuctions = Object.keys(auctions).reduce((current, key) => {
    const auction = auctions[key];
    const auctionSettings = state.settings.auctions.history.find(
      (settings) => settings.id === auction.auctionSettingsId,
    );

    if (!auctionSettings) {
      // ignore bad auctions, we have no way of knowing when it expires
      return current;
    }

    const endHeight = auction.startHeight + auctionSettings.auctionDuration;
    // still an active auction
    if (+endHeight > +SmartWeave.block.height) {
      current[key] = auction;
    } else {
      // update the records field but do not decrement balance from the initiator as that happens on auction initiation
      const endTimestamp =
        +auction.years * SECONDS_IN_A_YEAR + +SmartWeave.block.timestamp;
      state.records[key] = {
        type: auction.type,
        contractTxId: auction.contractTxId,
        ...(auction.type === 'lease' ? { endTimestamp: endTimestamp } : {}),
        startTimestamp: +SmartWeave.block.timestamp,
        undernames: DEFAULT_UNDERNAME_COUNT,
      };
    }

    // now return the auction object
    return current;
  }, {});

  state.auctions = activeAuctions;

  return { state };
};
