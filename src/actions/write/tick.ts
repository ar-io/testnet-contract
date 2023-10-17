import { DEFAULT_UNDERNAME_COUNT, SECONDS_IN_A_YEAR } from '../../constants';
import {
  cloneDemandFactoringData,
  tallyNamePurchase,
  updateDemandFactor,
} from '../../pricing';
import {
  ArNSName,
  Auction,
  BlockHeight,
  BlockTimestamp,
  ContractResult,
  DeepReadonly,
  DemandFactoringData,
  Gateway,
  GatewayRegistrySettings,
  IOState,
  ReservedName,
} from '../../types';
import {
  isActiveReservedName,
  isExistingActiveRecord,
  isGatewayEligibleToLeave,
} from '../../utilities';

declare const SmartWeave: any; // TODO: tighter type bindings
declare const ContractError: any; // TODO: tighter type bindings

const tickInternal = ({
  currentBlockHeight,
  currentBlockTimestamp,
  state,
}: {
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  state: IOState;
}): IOState => {
  // const {
  //   records, // has per-height considerations
  //   auctions, // has per-height considerations
  //   reserved, // has per-height considerations by way of timestamps
  //   settings, // MAY NOT HAVE RELEVANCE - just used to pull auction settings
  // } = state;

  const updatedState = state;
  const { demandFactoring: prevDemandFactoring, fees: prevFees } = state;

  // Update the current demand factor if necessary
  Object.assign(
    updatedState,
    updateDemandFactor(currentBlockHeight, prevDemandFactoring, prevFees),
  );
  // Update auctions, records, and demand factor if necessary
  Object.assign(
    updatedState,
    tickAuctions({
      currentBlockHeight,
      currentBlockTimestamp,
      records: updatedState.records,
      auctions: updatedState.auctions,
      demandFactoring: updatedState.demandFactoring,
    }),
  );

  // update gateway registry and balances if necessary
  Object.assign(
    updatedState,
    tickGatewayRegistry({
      currentBlockHeight,
      gateways: updatedState.gateways,
      balances: updatedState.balances,
      registrySettings: updatedState.settings.registry,
    }),
  );

  return updatedState;
};

// Rebuilds the state's records list based on the current block's timestamp and the records' expiration timestamps
function tickRecords({
  currentBlockTimestamp,
  records,
}: {
  currentBlockTimestamp: BlockTimestamp;
  records: DeepReadonly<Record<string, ArNSName>>;
}): Pick<IOState, 'records'> {
  const updatedRecords = Object.keys(records).reduce(
    (acc: Record<string, ArNSName>, key: string) => {
      const record = records[key];
      if (isExistingActiveRecord({ record, currentBlockTimestamp })) {
        acc[key] = record;
      }
      return acc;
    },
    {},
  );
  // update our state
  return {
    records: updatedRecords,
  };
}

// Removes expired reserved names from the reserved names list
function tickReservedNames({
  currentBlockTimestamp,
  reservedNames,
}: {
  currentBlockTimestamp: BlockTimestamp;
  reservedNames: Record<string, ReservedName>;
}): Pick<IOState, 'reserved'> {
  const activeReservedNames = Object.keys(reservedNames).reduce(
    (acc: Record<string, ReservedName>, key: string) => {
      const reservedName = reservedNames[key];
      // still active reservation
      if (
        isActiveReservedName({
          caller: undefined,
          reservedName,
          currentBlockTimestamp,
        })
      ) {
        acc[key] = reservedName;
      }
      return acc;
    },
    {},
  );

  return {
    reserved: activeReservedNames,
  };
}

function tickGatewayRegistry({
  currentBlockHeight,
  gateways,
  balances,
  registrySettings,
}: {
  currentBlockHeight: BlockHeight;
  gateways: DeepReadonly<Record<string, Gateway>>;
  balances: DeepReadonly<Record<string, number>>;
  registrySettings: DeepReadonly<GatewayRegistrySettings>;
}): Pick<IOState, 'gateways' | 'balances'> {
  const updatedBalances = { ...balances };
  const updatedRegistry = Object.keys(gateways).reduce(
    (acc: Record<string, Gateway>, key: string) => {
      const gateway = gateways[key];
      // return any vaulted balances to the owner if they are expired
      const updatedVaults = [];
      for (const vault of gateway.vaults) {
        if (vault.end <= currentBlockHeight.valueOf()) {
          // return the vault balance to the owner and do not add back vault
          updatedBalances[key] += vault.balance;
        } else {
          // still an active vault
          updatedVaults.push(vault);
        }
      }
      // if it's not eligible to leave, keep it in the registry
      if (
        !shouldGatewayBeRemoved({
          gateway,
          currentBlockHeight,
          registrySettings,
        })
      ) {
        acc[key] = {
          ...gateway,
          vaults: updatedVaults,
        };
        return acc;
      }
      return acc;
    },
    {},
  );

  return {
    gateways: updatedRegistry,
    balances: updatedBalances,
  };
}

function tickAuctions({
  currentBlockHeight,
  currentBlockTimestamp,
  records,
  auctions,
  demandFactoring,
}: {
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  records: DeepReadonly<Record<string, ArNSName>>;
  auctions: DeepReadonly<Record<string, Auction>>;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): Pick<IOState, 'auctions' | 'records' | 'demandFactoring'> {
  // handle expired auctions
  const updatedRecords = { ...records };
  // TODO: don't clone it until you need to
  let updatedDemandFactoring = cloneDemandFactoringData(demandFactoring);
  const updatedAuctions = Object.keys(auctions).reduce(
    (acc: Record<string, Auction>, key) => {
      const auction = auctions[key];
      const auctionSettings = auction.settings;

      // endHeight represents the height at which the auction is CLOSED and at which bids are no longer accepted
      const endHeight = auction.startHeight + auctionSettings.auctionDuration;

      // still an active auction
      if (endHeight > currentBlockHeight.valueOf()) {
        acc[key] = auction;
        return acc;
      }

      // create the new record object
      const maybeEndTimestamp = (() => {
        switch (auction.type) {
          case 'permabuy':
            return {};
          case 'lease':
            // TODO: Block timestamps is broken here - user could be getting bonus time here when the next write interaction occurs
            // update the records field but do not decrement balance from the initiator as that happens on auction initiation
            return {
              endTimestamp:
                +auction.years * SECONDS_IN_A_YEAR +
                +SmartWeave.block.timestamp,
            };
        }
      })();
      updatedRecords[key] = {
        type: auction.type,
        contractTxId: auction.contractTxId,
        // TODO: get the end timestamp of the auction based on what block it ended at, not the timestamp of the current interaction timestamp
        startTimestamp: currentBlockTimestamp.valueOf(),
        undernames: DEFAULT_UNDERNAME_COUNT,
        ...maybeEndTimestamp,
      };

      updatedDemandFactoring = tallyNamePurchase(updatedDemandFactoring);
      // now return the auction object
      return acc;
    },
    {},
  );
  // update auctions (records was already modified)
  return {
    auctions: updatedAuctions,
    records: updatedRecords,
    demandFactoring: updatedDemandFactoring,
  };
}

// Removes gateway from the gateway address registry after the leave period completes
export const tick = (state: IOState): ContractResult => {
  const interactionHeight = new BlockHeight(+SmartWeave.block.height);
  const interactionTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);

  if (interactionHeight.valueOf() === state.lastTickedHeight) {
    return { state };
  }

  if (interactionHeight.valueOf() < state.lastTickedHeight) {
    throw new ContractError(
      `Interaction height ${interactionHeight} is less than last ticked height ${state.lastTickedHeight}`,
    );
  }

  // Iterate through each block height between the last ticked state and the interaction height
  let updatedState: IOState = {
    ...state,
  };
  for (
    let tickHeight = state.lastTickedHeight + 1;
    tickHeight <= interactionHeight.valueOf();
    tickHeight++
  ) {
    const currentBlockHeight = new BlockHeight(tickHeight);
    // TODO: calculate block timestamp from SmartWeave API for each block increment
    updatedState = tickInternal({
      currentBlockHeight,
      currentBlockTimestamp: interactionTimestamp,
      state: updatedState,
    });
  }

  // tick records
  Object.assign(
    updatedState,
    tickRecords({
      currentBlockTimestamp: interactionTimestamp,
      records: updatedState.records,
    }),
  );

  // tick reserved names
  Object.assign(
    updatedState,
    tickReservedNames({
      currentBlockTimestamp: interactionTimestamp,
      reservedNames: updatedState.reserved,
    }),
  );

  return { state: updatedState };
};
