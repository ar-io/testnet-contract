import { DEFAULT_UNDERNAME_COUNT, SECONDS_IN_A_YEAR } from '../../constants';
import {
  cloneDemandFactoringData,
  tallyNamePurchase,
  updateDemandFactor,
} from '../../pricing';
import {
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  ContractWriteResult,
  DeepReadonly,
  DemandFactoringData,
  Gateways,
  IOState,
  Records,
  RegistryVaults,
  ReservedNames,
  VaultData,
  Vaults,
  WalletAddress,
} from '../../types';
import {
  incrementBalance,
  isActiveReservedName,
  isExistingActiveRecord,
  isGatewayEligibleToBeRemoved,
} from '../../utilities';

function tickInternal({
  currentBlockHeight,
  currentBlockTimestamp,
  state,
}: {
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  state: IOState;
}): IOState {
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
    }),
  );

  // update vaults and balances if necessary
  Object.assign(
    updatedState,
    tickVaults({
      currentBlockHeight,
      vaults: updatedState.vaults,
      balances: updatedState.balances,
    }),
  );

  // tick records
  Object.assign(
    updatedState,
    tickRecords({
      currentBlockTimestamp,
      records: updatedState.records,
    }),
  );

  // tick reserved names
  Object.assign(
    updatedState,
    tickReservedNames({
      currentBlockTimestamp,
      reservedNames: updatedState.reserved,
    }),
  );

  // update last ticked height
  Object.assign(updatedState, {
    lastTickedHeight: currentBlockHeight.valueOf(),
  });

  return updatedState;
}

// Rebuilds the state's records list based on the current block's timestamp and the records' expiration timestamps
export function tickRecords({
  currentBlockTimestamp,
  records,
}: {
  currentBlockTimestamp: BlockTimestamp;
  records: DeepReadonly<Records>;
}): Pick<IOState, 'records'> {
  const updatedRecords = Object.keys(records).reduce(
    (acc: Records, key: string) => {
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
export function tickReservedNames({
  currentBlockTimestamp,
  reservedNames,
}: {
  currentBlockTimestamp: BlockTimestamp;
  reservedNames: DeepReadonly<ReservedNames>;
}): Pick<IOState, 'reserved'> {
  const activeReservedNames = Object.keys(reservedNames).reduce(
    (acc: ReservedNames, key: string) => {
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

export function tickGatewayRegistry({
  currentBlockHeight,
  gateways,
  balances,
}: {
  currentBlockHeight: BlockHeight;
  gateways: DeepReadonly<Gateways>;
  balances: DeepReadonly<Balances>;
}): Pick<IOState, 'gateways' | 'balances'> {
  const updatedBalances: Balances = {};
  const updatedRegistry = Object.keys(gateways).reduce(
    (acc: Gateways, key: string) => {
      const gateway = gateways[key];

      // if it's not eligible to leave, keep it in the registry
      if (
        isGatewayEligibleToBeRemoved({
          gateway,
          currentBlockHeight,
        })
      ) {
        if (!updatedBalances[key]) {
          updatedBalances[key] = balances[key] ?? 0;
        }

        // gateway is leaving, make sure we return all the vaults to it
        for (const vault of Object.values(gateway.vaults)) {
          incrementBalance(updatedBalances, key, vault.balance);
        }
        // return any remaining operator stake
        incrementBalance(updatedBalances, key, gateway.operatorStake);
        return acc;
      }
      // return any vaulted balances to the owner if they are expired, but keep the gateway
      const updatedVaults: Vaults = {};
      for (const [id, vault] of Object.entries(gateway.vaults)) {
        if (vault.end <= currentBlockHeight.valueOf()) {
          if (!updatedBalances[key]) {
            updatedBalances[key] = balances[key] ?? 0;
          }
          // return the vault balance to the owner and do not add back vault
          incrementBalance(updatedBalances, key, vault.balance);
        } else {
          // still an active vault
          updatedVaults[id] = vault;
        }
      }
      acc[key] = {
        ...gateway,
        vaults: updatedVaults,
      };
      return acc;
    },
    {},
  );

  // avoids copying balances if not necessary
  const newBalances: Balances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  return {
    gateways: updatedRegistry,
    balances: newBalances,
  };
}

export function tickVaults({
  currentBlockHeight,
  vaults,
  balances,
}: {
  currentBlockHeight: BlockHeight;
  vaults: DeepReadonly<RegistryVaults>;
  balances: DeepReadonly<Balances>;
}): Pick<IOState, 'vaults' | 'balances'> {
  const updatedBalances: { [address: string]: number } = {};
  const updatedVaults = Object.keys(vaults).reduce(
    (acc: RegistryVaults, address: WalletAddress) => {
      const activeVaults: Vaults = Object.entries(vaults[address]).reduce(
        (addressVaults: Vaults, [id, vault]: [string, VaultData]) => {
          if (vault.end <= currentBlockHeight.valueOf()) {
            // Initialize the balance if it hasn't been yet
            if (!updatedBalances[address]) {
              updatedBalances[address] = balances[address] ?? 0;
            }
            // Unlock the vault and update the balance
            incrementBalance(updatedBalances, address, vault.balance);
            return addressVaults;
          }
          addressVaults[id] = vault;
          return addressVaults;
        },
        {},
      );

      if (Object.keys(activeVaults).length > 0) {
        // Only add to the accumulator if there are active vaults remaining
        acc[address] = activeVaults;
      }
      return acc;
    },
    {},
  );

  // avoids copying balances if not necessary
  const newBalances: Balances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  return {
    vaults: updatedVaults,
    balances: newBalances,
  };
}

export function tickAuctions({
  currentBlockHeight,
  currentBlockTimestamp,
  records,
  auctions,
  demandFactoring,
}: {
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  records: DeepReadonly<Records>;
  auctions: DeepReadonly<Auctions>;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): Pick<IOState, 'auctions' | 'records' | 'demandFactoring'> {
  // handle expired auctions
  const updatedRecords: Records = {};
  let updatedDemandFactoring = cloneDemandFactoringData(demandFactoring);
  const updatedAuctions = Object.keys(auctions).reduce((acc: Auctions, key) => {
    const auction = auctions[key];

    // endHeight represents the height at which the auction is CLOSED and at which bids are no longer accepted
    if (auction.endHeight >= currentBlockHeight.valueOf()) {
      acc[key] = auction;
      return acc;
    }
    // create the new record object
    switch (auction.type) {
      case 'permabuy':
        updatedRecords[key] = {
          type: auction.type,
          contractTxId: auction.contractTxId,
          startTimestamp: currentBlockTimestamp.valueOf(),
          undernames: DEFAULT_UNDERNAME_COUNT,
          purchasePrice: auction.floorPrice,
        };
        break;
      case 'lease':
        updatedRecords[key] = {
          type: auction.type,
          contractTxId: auction.contractTxId,
          startTimestamp: currentBlockTimestamp.valueOf(),
          undernames: DEFAULT_UNDERNAME_COUNT,
          // TODO: Block timestamps is broken here - user could be getting bonus time here when the next write interaction occurs
          // update the records field but do not decrement balance from the initiator as that happens on auction initiation
          endTimestamp:
            +auction.years! * SECONDS_IN_A_YEAR + // TODO: Avoid force unwrapping years
            currentBlockTimestamp.valueOf(),
          purchasePrice: auction.floorPrice,
        };
        break;
    }

    updatedDemandFactoring = tallyNamePurchase(
      updatedDemandFactoring,
      auction.floorPrice,
    );
    // now return the auction object
    return acc;
  }, {});

  // avoid copying records if not necessary
  const newRecords = Object.keys(updatedRecords).length
    ? {
        ...records,
        ...updatedRecords,
      }
    : records;
  // update auctions
  return {
    auctions: updatedAuctions,
    records: newRecords,
    demandFactoring: updatedDemandFactoring,
  };
}

// Removes gateway from the gateway address registry after the leave period completes
export const tick = async (state: IOState): Promise<ContractWriteResult> => {
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
    /**
     * TODO: once safeArweaveGet is more reliable, we can get the timestamp from the block between ticks to provide the timestamp. We are currently experiencing 'timeout' errors on evaluations for large gaps between interactions so we cannot reliably trust it with the current implementation.
     * */
    updatedState = tickInternal({
      currentBlockHeight,
      currentBlockTimestamp: interactionTimestamp,
      state: updatedState,
    });
  }

  return { state: updatedState };
};
