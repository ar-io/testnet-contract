import {
  BAD_OBSERVER_GATEWAY_PENALTY,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_UNDERNAME_COUNT,
  EPOCH_REWARD_PERCENTAGE,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  OBSERVATION_FAILURE_THRESHOLD,
  SECONDS_IN_A_YEAR,
  TALLY_PERIOD_BLOCKS,
} from '../../constants';
import {
  getEligibleGatewaysForEpoch,
  getPrescribedObserversForEpoch,
} from '../../observers';
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
  GatewayDistributions,
  Gateways,
  IOState,
  Observations,
  ObserverDistributions,
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

async function tickInternal({
  currentBlockHeight,
  currentBlockTimestamp,
  state,
}: {
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  state: IOState;
}): Promise<IOState> {
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
    await tickRewardDistribution({
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

        // TODO: remove gateways that have observation fail count > threshold

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
  const updatedBalances: Balances = {};
  const currentProtocolBalance = balances[SmartWeave.contract.id] || 0;
  const updatedGatewayDistributions: GatewayDistributions = {};
  const updatedObserverDistributions: ObserverDistributions = {};

  const distributionHeightForEpoch = new BlockHeight(
    distributions.epochDistributionHeight,
  );

  // distribution should only happen ONCE on block that is TALLY_PERIOD_BLOCKS after the last completed epoch
  if (currentBlockHeight.valueOf() !== distributionHeightForEpoch.valueOf()) {
    return {
      // remove the readonly and avoid slicing/copying arrays if not necessary
      distributions: distributions as RewardDistributions,
      balances,
    };
  }

  // get our epoch heights
  const epochStartHeight = new BlockHeight(distributions.epochStartHeight);
  const epochEndHeight = new BlockHeight(distributions.epochEndHeight);

  // get all the reports submitted for the epoch based on its start height
  const totalReportsSubmitted = Object.keys(
    observations[epochStartHeight.valueOf()]?.reports || [],
  ).length;

  // this should be consistently 50 observers * 51% - if you have more than 26 failed reports - you are not eligible for a reward
  const failureReportCountThreshold = Math.floor(
    totalReportsSubmitted * OBSERVATION_FAILURE_THRESHOLD,
  );

  // filter out gateways eligible for epoch distribution
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  // get the observers for the epoch
  const prescribedObservers = await getPrescribedObserversForEpoch({
    eligibleGateways,
    epochStartHeight,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    distributions,
  });

  // TODO: consider having this be a set, gateways can not run on the same wallet
  const gatewaysToReward: WalletAddress[] = [];
  // note this should not be a set, you can run multiple gateways with one wallet
  const observerGatewaysToReward: WalletAddress[] = [];

  // identify observers who reported the above gateways as eligible for rewards
  for (const gatewayAddress in eligibleGateways) {
    const existingGatewaySummary = distributions.gateways[gatewayAddress];

    // add our gateway to the updated distributions
    updatedGatewayDistributions[gatewayAddress] = {
      passedEpochCount: existingGatewaySummary?.passedEpochCount || 0,
      failedConsecutiveEpochs:
        existingGatewaySummary?.failedConsecutiveEpochs || 0,
      totalEpochParticipationCount:
        (existingGatewaySummary?.totalEpochParticipationCount || 0) + 1, // increment the total right away
    };

    // handle the case of no observations for the epoch by not rewarding the gateway
    if (!observations[epochStartHeight.valueOf()]?.reports) {
      continue;
    }

    // iterate through all the failure summaries for the gateway
    const totalNumberOfFailuresReported = (
      observations[epochStartHeight.valueOf()]?.failureSummaries[
        gatewayAddress
      ] || []
    ).length;

    // no reward given, go to the next eligible gateway
    if (totalNumberOfFailuresReported > failureReportCountThreshold) {
      // increment the failed epoch count of the gateway - if three we will kick out the gateway
      updatedGatewayDistributions[gatewayAddress].failedConsecutiveEpochs += 1;
      // TODO: check if over count and remove from GAR!
      continue;
    }

    // update the passed epoch count
    updatedGatewayDistributions[gatewayAddress].passedEpochCount += 1;
    // reset its failed epoch count
    updatedGatewayDistributions[gatewayAddress].failedConsecutiveEpochs = 0;
    // assign it for a reward
    gatewaysToReward.push(gatewayAddress);
  }

  // identify observers who reported the above gateways as eligible for rewards
  for (const observer of prescribedObservers) {
    const existingObserverSummary =
      distributions.observers[observer.observerAddress];

    // add our observer to the updated distributions
    updatedObserverDistributions[observer.observerAddress] = {
      submittedEpochCount: existingObserverSummary?.submittedEpochCount || 0,
      totalEpochsPrescribedCount:
        (existingObserverSummary?.totalEpochsPrescribedCount || 0) + 1,
    };

    const observerSubmittedReportForEpoch =
      observations[epochStartHeight.valueOf()]?.reports[
        observer.observerAddress
      ];
    if (!observerSubmittedReportForEpoch) {
      continue;
    }

    // update the number of epochs this observer has passed
    updatedObserverDistributions[
      observer.observerAddress
    ].submittedEpochCount += 1;

    // make it eligible for observer rewards, use the gateway address and not the observer address
    observerGatewaysToReward.push(observer.gatewayAddress);
  }

  // prepare for distributions
  // calculate epoch rewards X% of current protocol balance split amongst gateways and observers
  const totalPotentialReward = Math.floor(
    currentProtocolBalance * EPOCH_REWARD_PERCENTAGE,
  );

  const totalPotentialGatewayReward = Math.floor(
    totalPotentialReward * GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  );

  // there may be a delta depending on the number of failures - it calculates this reward based on the number of distributions that should have passed
  const perGatewayReward = Object.keys(eligibleGateways).length
    ? Math.floor(
        totalPotentialGatewayReward / Object.keys(eligibleGateways).length,
      )
    : 0;

  // the remaining (i.e. 5%)
  const totalPotentialObserverReward =
    totalPotentialReward - totalPotentialGatewayReward;

  const perObserverReward = Object.keys(prescribedObservers).length
    ? Math.floor(
        totalPotentialObserverReward / Object.keys(prescribedObservers).length,
      )
    : 0;

  // TODO: set thresholds for the perGatewayReward and perObserverReward to be greater than at least 1 mIO

  // // distribute observer tokens
  for (const gatewayAddress of gatewaysToReward) {
    // add protocol balance if we do not have it
    if (!updatedBalances[SmartWeave.contract.id]) {
      updatedBalances[SmartWeave.contract.id] =
        balances[SmartWeave.contract.id] || 0;
    }

    // add the address if we do not have it
    if (!updatedBalances[gatewayAddress]) {
      updatedBalances[gatewayAddress] = balances[gatewayAddress] || 0;
    }

    let totalGatewayReward = perGatewayReward;
    // if you were prescribed observer but didn't submit a report, you get gateway reward penalized
    if (
      Object.keys(prescribedObservers).includes(gatewayAddress) &&
      !Object.keys(observerGatewaysToReward).includes(gatewayAddress)
    ) {
      // you don't get the full gateway reward if you didn't submit a report
      totalGatewayReward = Math.floor(
        totalGatewayReward * BAD_OBSERVER_GATEWAY_PENALTY,
      );
    }

    safeTransfer({
      balances: updatedBalances,
      fromAddress: SmartWeave.contract.id,
      toAddress: gatewayAddress,
      qty: totalGatewayReward,
    });
  }

  // distribute observer tokens
  for (const gatewayObservedAndPassed of observerGatewaysToReward) {
    // add protocol balance if we do not have it
    if (!updatedBalances[SmartWeave.contract.id]) {
      updatedBalances[SmartWeave.contract.id] =
        balances[SmartWeave.contract.id] || 0;
    }

    // add the address if we do not have it
    if (!updatedBalances[gatewayObservedAndPassed]) {
      updatedBalances[gatewayObservedAndPassed] =
        balances[gatewayObservedAndPassed] || 0;
    }

    safeTransfer({
      balances: updatedBalances,
      fromAddress: SmartWeave.contract.id,
      toAddress: gatewayObservedAndPassed,
      qty: perObserverReward,
    });
  }

  // avoids copying balances if not necessary
  const newBalances: Balances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  const nextEpochStartHeight = epochEndHeight.valueOf() + 1;
  const nextEpochEndHeight =
    epochEndHeight.valueOf() + DEFAULT_EPOCH_BLOCK_LENGTH;

  const updatedDistributions: RewardDistributions = {
    gateways: {
      ...distributions.gateways,
      ...updatedGatewayDistributions,
    },
    observers: {
      ...distributions.observers,
      ...updatedObserverDistributions,
    },
    // increment epoch variables to the next one
    epochStartHeight: nextEpochStartHeight,
    epochEndHeight: nextEpochEndHeight,
    epochZeroStartHeight: distributions.epochZeroStartHeight,
    epochDistributionHeight: nextEpochEndHeight + TALLY_PERIOD_BLOCKS,
  };

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
    updatedState = await tickInternal({
      currentBlockHeight,
      currentBlockTimestamp: interactionTimestamp,
      state: updatedState,
    });
  }

  return { state: updatedState };
};
