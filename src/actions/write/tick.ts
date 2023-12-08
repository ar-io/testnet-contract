import {
  BAD_OBSERVER_GATEWAY_PENALTY,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  DEFAULT_UNDERNAME_COUNT,
  EPOCH_REWARD_PERCENTAGE,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  NUM_OBSERVERS_PER_EPOCH,
  OBSERVATION_FAILURE_THRESHOLD,
  SECONDS_IN_A_YEAR,
  TALLY_PERIOD_BLOCKS,
} from '../../constants';
import { getEpochStart, getPrescribedObservers } from '../../observers';
import {
  cloneDemandFactoringData,
  tallyNamePurchase,
  updateDemandFactor,
} from '../../pricing';
import { safeTransfer } from '../../transfer';
import {
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  ContractSettings,
  ContractWriteResult,
  DeepReadonly,
  DemandFactoringData,
  Gateways,
  IOState,
  Observations,
  PassedEpochs,
  Records,
  RegistryVaults,
  ReservedNames,
  RewardDistributions,
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

  // Update auctions, balances, records, and demand factor if necessary
  Object.assign(
    updatedState,
    tickAuctions({
      currentBlockHeight,
      currentBlockTimestamp,
      records: updatedState.records,
      auctions: updatedState.auctions,
      balances: updatedState.balances,
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

  // tick reward distribution
  Object.assign(
    updatedState,
    tickRewardDistribution({
      currentBlockHeight,
      gateways: updatedState.gateways,
      distributions: updatedState.distributions,
      observations: updatedState.observations,
      balances: updatedState.balances,
      settings: updatedState.settings,
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
          updatedBalances[key] = balances[key] || 0;
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
            updatedBalances[key] = balances[key] || 0;
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
              updatedBalances[address] = balances[address] || 0;
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
  balances,
  auctions,
  demandFactoring,
}: {
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  records: DeepReadonly<Records>;
  balances: DeepReadonly<Balances>;
  auctions: DeepReadonly<Auctions>;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): Pick<IOState, 'balances' | 'auctions' | 'records' | 'demandFactoring'> {
  // handle expired auctions
  const updatedRecords: Records = {};
  const updatedBalances: Balances = {};
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
            +auction.years * SECONDS_IN_A_YEAR +
            currentBlockTimestamp.valueOf(),
          purchasePrice: auction.floorPrice,
        };
        break;
    }

    // set it if we do not have it yet
    if (!updatedBalances[SmartWeave.contract.id]) {
      updatedBalances[SmartWeave.contract.id] =
        balances[SmartWeave.contract.id] || 0;
    }

    // give the auction floor to the protocol balance
    incrementBalance(
      updatedBalances,
      SmartWeave.contract.id,
      auction.floorPrice,
    );

    // update the demand factor
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

  const newBalances = Object.keys(updatedBalances).length
    ? {
        ...balances,
        ...updatedBalances,
      }
    : balances;

  // results
  return {
    auctions: updatedAuctions,
    balances: newBalances,
    records: newRecords,
    demandFactoring: updatedDemandFactoring,
  };
}

export async function tickRewardDistribution({
  currentBlockHeight,
  gateways,
  distributions,
  observations,
  balances,
  settings,
}: {
  currentBlockHeight: BlockHeight;
  gateways: DeepReadonly<Gateways>;
  distributions: DeepReadonly<RewardDistributions>;
  observations: DeepReadonly<Observations>;
  balances: DeepReadonly<Balances>;
  settings: DeepReadonly<ContractSettings>;
}): Promise<Pick<IOState, 'distributions' | 'balances'>> {
  const updatedPassedGatewayEpochs: PassedEpochs = {};
  const updatedPassedObserverEpochs: PassedEpochs = {};
  const updatedBalances: Balances = {};
  const currentEpochStartHeight = getEpochStart({
    startHeight: new BlockHeight(DEFAULT_START_HEIGHT),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    height: currentBlockHeight,
  });
  const lastEpochStartHeight = new BlockHeight(
    currentEpochStartHeight.valueOf() - DEFAULT_EPOCH_BLOCK_LENGTH,
  );
  const lastEpochEndHeight = new BlockHeight(
    lastEpochStartHeight.valueOf() + DEFAULT_EPOCH_BLOCK_LENGTH,
  );
  const newDistributions: RewardDistributions = {
    lastCompletedEpoch: distributions.lastCompletedEpoch,
    passedGatewayEpochs: {},
    passedObserverEpochs: {},
  };

  // no distribution should happen if the current block height is not greater than the last completed epoch + the required blocks to have passed for a new distribution
  if (
    currentBlockHeight.valueOf() < distributions.lastCompletedEpoch ||
    currentBlockHeight.valueOf() <
      lastEpochStartHeight.valueOf() + TALLY_PERIOD_BLOCKS ||
    !(lastEpochEndHeight.valueOf() in observations)
  ) {
    return {
      // remove the readonly and avoid slicing/copying arrays if not necessary
      distributions: distributions as RewardDistributions,
      balances,
    };
  }

  const totalReportsSubmitted = Object.keys(
    observations[lastEpochStartHeight.valueOf()].reports,
  ).length;

  const failureThreshold = Math.floor(
    totalReportsSubmitted * OBSERVATION_FAILURE_THRESHOLD,
  );

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    distributions,
    settings.registry.minNetworkJoinStakeAmount,
    settings.registry.gatewayLeaveLength,
    lastEpochStartHeight, // ensure we get the prescribed observe
  );

  const eligibleGatewayAddresses: WalletAddress[] = Object.keys(
    gateways,
  ).filter(
    (address: WalletAddress) =>
      gateways[address].start > lastEpochStartHeight.valueOf(),
  );

  for (const gatewayAddress of eligibleGatewayAddresses) {
    // check if each eligible gateway is under the failure threshold for their tallied report
    if (
      observations[lastEpochStartHeight.valueOf()].failureSummaries[
        gatewayAddress
      ]
    ) {
      if (
        observations[lastEpochStartHeight.valueOf()].failureSummaries[
          gatewayAddress
        ].length <= failureThreshold
      ) {
        // gateway gets a reward
        // check if it has ever been rewarded as a gateway before
        if (gatewayAddress in newDistributions.passedGatewayEpochs) {
          newDistributions.passedGatewayEpochs[gatewayAddress].push(
            lastEpochStartHeight.valueOf(),
          );
        } else {
          newDistributions.passedGatewayEpochs[gatewayAddress] = [
            lastEpochStartHeight.valueOf(),
          ];
        }
      } else {
        // do nothing as it is ineligible for rewards since it was above failure threshold
      }
    }

    // check if this gateway was prescribed observer to submit a report during this epoch
    if (
      gatewayAddress in observations[lastEpochStartHeight.valueOf()].reports
    ) {
      // observer gets a reward
      // check if it has ever been rewarded as an observer before
      if (gatewayAddress in newDistributions.passedObserverEpochs) {
        newDistributions.passedObserverEpochs[gatewayAddress].push(
          lastEpochStartHeight.valueOf(),
        );
      } else {
        newDistributions.passedObserverEpochs[gatewayAddress] = [
          lastEpochStartHeight.valueOf(),
        ];
      }
    }
  }

  // prepare for distributions
  // calculate epoch rewards X% of current protocol balance split amongst gateways and observers
  const totalPotentialReward = Math.floor(
    balances[SmartWeave.contract.id] * EPOCH_REWARD_PERCENTAGE,
  );

  const totalPotentialGatewayReward = Math.floor(
    totalPotentialReward * GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  );

  const gatewayReward = Math.floor(
    totalPotentialGatewayReward / eligibleGatewayAddresses.length,
  );

  const totalPotentialObserverReward =
    totalPotentialReward - totalPotentialGatewayReward;

  const observerReward = Math.floor(
    totalPotentialObserverReward / NUM_OBSERVERS_PER_EPOCH,
  );

  // distribute observer tokens
  for (const passedObserverAddress in newDistributions.passedObserverEpochs) {
    // add protocol balance if we do not have it
    if (!updatedBalances[SmartWeave.contract.id]) {
      updatedBalances[SmartWeave.contract.id] =
        balances[SmartWeave.contract.id] || 0;
    }

    // add the address if we do not have it
    if (!updatedBalances[passedObserverAddress]) {
      updatedBalances[passedObserverAddress] =
        balances[passedObserverAddress] || 0;
    }

    safeTransfer({
      balances: updatedBalances,
      fromAddress: SmartWeave.contract.id,
      toAddress: passedObserverAddress,
      qty: observerReward,
    });
  }

  // distribute gateway tokens
  for (const passedGatewayAddress in newDistributions.passedGatewayEpochs) {
    let updatedGatewayReward = gatewayReward;
    // Check if this gateway failed its observation duty
    if (
      prescribedObservers.some(
        (observer) =>
          observer.gatewayAddress === passedGatewayAddress ||
          observer.observerAddress ===
            gateways[passedGatewayAddress].observerWallet,
      ) &&
      !(
        passedGatewayAddress in
        observations[lastEpochStartHeight.valueOf()].reports
      )
    ) {
      // The gateway was prescribed but did not
      updatedGatewayReward = Math.floor(
        updatedGatewayReward * BAD_OBSERVER_GATEWAY_PENALTY,
      );
    }

    // add protocol balance if we do not have it
    if (!updatedBalances[SmartWeave.contract.id]) {
      updatedBalances[SmartWeave.contract.id] =
        balances[SmartWeave.contract.id] || 0;
    }

    // add the address if we do not have it
    if (!updatedBalances[passedGatewayAddress]) {
      updatedBalances[passedGatewayAddress] =
        balances[passedGatewayAddress] || 0;
    }

    safeTransfer({
      balances: updatedBalances,
      fromAddress: SmartWeave.contract.id,
      toAddress: passedGatewayAddress,
      qty: updatedGatewayReward,
    });
  }

  // Mark this as the last completed epoch
  newDistributions.lastCompletedEpoch = lastEpochStartHeight.valueOf();

  // MAKE THIS A FUNCTION - can these be moved into the for loop above
  for (const [passedGatewayAddress, epochs] of Object.entries(
    distributions.passedGatewayEpochs,
  )) {
    updatedPassedGatewayEpochs[passedGatewayAddress] = newDistributions
      .passedGatewayEpochs[passedGatewayAddress] || [...epochs];
  }

  // can these be moved into the for loop above
  for (const [address, epochs] of Object.entries(
    distributions.passedObserverEpochs,
  )) {
    updatedPassedObserverEpochs[address] = newDistributions
      .passedObserverEpochs[address] || [...epochs];
  }

  const updatedDistributions: RewardDistributions = {
    lastCompletedEpoch: newDistributions.lastCompletedEpoch,
    passedGatewayEpochs: updatedPassedGatewayEpochs,
    passedObserverEpochs: updatedPassedObserverEpochs,
  };

  // avoids copying balances if not necessary
  const newBalances: Balances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  return {
    distributions: updatedDistributions,
    balances: newBalances,
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
