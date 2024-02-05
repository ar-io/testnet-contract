import {
  BAD_OBSERVER_GATEWAY_PENALTY,
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  DEFAULT_UNDERNAME_COUNT,
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  EPOCH_REWARD_PERCENTAGE,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  GATEWAY_REGISTRY_SETTINGS,
  INITIAL_EPOCH_DISTRIBUTION_DATA,
  OBSERVATION_FAILURE_THRESHOLD,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { safeDelegateDistribution } from '../../delegateStake';
import {
  getEligibleGatewaysForEpoch,
  getEpochDataForHeight,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  cloneDemandFactoringData,
  tallyNamePurchase,
  updateDemandFactor,
} from '../../pricing';
import { isActiveReservedName, isExistingActiveRecord } from '../../records';
import { safeTransfer } from '../../transfer';
import {
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  ContractWriteResult,
  DeepReadonly,
  Delegates,
  DemandFactoringData,
  EpochDistributionData,
  GatewayPerformanceStats,
  Gateways,
  IOState,
  IOToken,
  Observations,
  PrescribedObservers,
  Records,
  RegistryVaults,
  ReservedNames,
  VaultData,
  Vaults,
  WalletAddress,
  WeightedObserver,
} from '../../types';
import {
  incrementBalance,
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
      distributions:
        updatedState.distributions || INITIAL_EPOCH_DISTRIBUTION_DATA,
      observations: updatedState.observations || {},
      balances: updatedState.balances,
      prescribedObservers: updatedState.prescribedObservers || {},
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

      // If the gateway is eligible to be removed, all its operator and delegate stakes are returned
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

        for (const vault of Object.values(gateway.vaults)) {
          incrementBalance(updatedBalances, key, vault.balance);
        }
        // return any remaining operator stake
        if (gateway.operatorStake) {
          incrementBalance(updatedBalances, key, gateway.operatorStake);
        }
        // return any delegated stake
        for (const [delegateAddress, delegate] of Object.entries(
          gateway.delegates,
        )) {
          for (const vault of Object.values(delegate.vaults)) {
            // return the vault balance to the delegate and do not add back vault
            incrementBalance(updatedBalances, delegateAddress, vault.balance);
          }
          // return any remaining delegate stake
          if (delegate.delegatedStake) {
            incrementBalance(
              updatedBalances,
              delegateAddress,
              delegate.delegatedStake,
            );
          }
        }
        return acc;
      }

      // The gateway is not leaving yet
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

      // return any vaulted balances to delegates if they are expired, but keep the delegate
      const updatedDelegates: Delegates = {};
      for (const [delegateAddress, delegate] of Object.entries(
        gateway.delegates,
      )) {
        // Check if this delegate was added to updated delegates
        if (!updatedDelegates[delegateAddress]) {
          updatedDelegates[delegateAddress] = {
            ...gateways[key].delegates[delegateAddress],
            vaults: {}, // start with no vaults
          };
        }
        for (const [id, vault] of Object.entries(delegate.vaults)) {
          if (vault.end <= currentBlockHeight.valueOf()) {
            if (!updatedBalances[delegateAddress]) {
              updatedBalances[delegateAddress] = balances[delegateAddress] || 0;
            }

            // return the vault balance to the delegate and do not add back vault
            incrementBalance(updatedBalances, delegateAddress, vault.balance);
          } else {
            // still an active vault so add it
            updatedDelegates[delegateAddress].vaults[id] = vault;
          }
        }
        if (
          updatedDelegates[delegateAddress].delegatedStake === 0 &&
          Object.keys(updatedDelegates[delegateAddress].vaults).length === 0
        ) {
          // This delegate must be removed from updated delegates because it has no more vaults or stake
          delete updatedDelegates[delegateAddress];
        }
      }
      acc[key] = {
        ...gateway,
        delegates: updatedDelegates,
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
  prescribedObservers,
}: {
  currentBlockHeight: BlockHeight;
  gateways: DeepReadonly<Gateways>;
  distributions: DeepReadonly<EpochDistributionData>;
  observations: DeepReadonly<Observations>;
  balances: DeepReadonly<Balances>;
  prescribedObservers: DeepReadonly<PrescribedObservers>;
}): Promise<
  Pick<
    IOState,
    'distributions' | 'balances' | 'gateways' | 'prescribedObservers'
  >
> {
  const updatedBalances: Balances = {};
  const updatedGateways: Gateways = {};
  const currentProtocolBalance = balances[SmartWeave.contract.id] || 0;

  const distributionHeightForLastEpoch = new BlockHeight(
    distributions.nextDistributionHeight,
  );

  // distribution should only happen ONCE on block that is EPOCH_DISTRIBUTION_DELAY after the last completed epoch
  if (
    currentBlockHeight.valueOf() !== distributionHeightForLastEpoch.valueOf()
  ) {
    const {
      epochStartHeight: nextEpochStartHeight,
      epochEndHeight: nextEpochEndHeight,
      epochPeriod: newEpochPeriod,
    } = getEpochDataForHeight({
      currentBlockHeight,
      epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
      epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
    });

    const updatedPrescribedObservers = await getPrescribedObserversForEpoch({
      gateways,
      epochStartHeight: nextEpochStartHeight,
      epochEndHeight: nextEpochEndHeight,
      distributions,
      minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
    });
    // increment the epoch variables if we've moved to the next epoch, but DO NOT update the nextDistributionHeight as that will happen below after distributions are complete
    const updatedEpochData: EpochDistributionData = {
      epochStartHeight: nextEpochStartHeight.valueOf(),
      epochEndHeight: nextEpochEndHeight.valueOf(),
      epochZeroStartHeight: distributions.epochZeroStartHeight,
      nextDistributionHeight: distributionHeightForLastEpoch.valueOf(), // DON'T UPDATE THIS UNTIL THE DISTRIBUTION OCCURS
      epochPeriod: newEpochPeriod.valueOf(),
    };

    return {
      distributions: updatedEpochData,
      balances,
      gateways,
      prescribedObservers: {
        [nextEpochStartHeight.valueOf()]: updatedPrescribedObservers,
      },
    };
  }

  // get our epoch heights based off the distribution end height
  const { epochStartHeight, epochEndHeight } = getEpochDataForHeight({
    currentBlockHeight: new BlockHeight(
      distributionHeightForLastEpoch.valueOf() - EPOCH_DISTRIBUTION_DELAY - 1,
    ),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  // get all the reports submitted for the epoch based on its start height
  const totalReportsSubmitted = Object.keys(
    observations[epochStartHeight.valueOf()]?.reports || [],
  ).length;

  // this should be consistently 50 observers * 50% + 1 - if you have more than 26 failed reports - you are not eligible for a reward
  const failureReportCountThreshold = Math.floor(
    totalReportsSubmitted * OBSERVATION_FAILURE_THRESHOLD,
  );

  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  // get the observers for the epoch - if we don't have it in state we need to compute it
  const previouslyPrescribedObservers =
    prescribedObservers[epochStartHeight.valueOf()] ||
    (await getPrescribedObserversForEpoch({
      gateways,
      epochStartHeight,
      epochEndHeight,
      distributions,
      minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
    }));

  // TODO: consider having this be a set, gateways can not run on the same wallet
  const gatewaysToReward: WalletAddress[] = [];
  const observerGatewaysToReward: WalletAddress[] = [];

  // identify observers who reported the above gateways as eligible for rewards
  for (const [gatewayAddress, existingGateway] of Object.entries(
    eligibleGateways,
  )) {
    // unlikely - but don't continue
    if (!existingGateway) {
      continue;
    }

    const existingGatewayStats: GatewayPerformanceStats =
      existingGateway.stats || DEFAULT_GATEWAY_PERFORMANCE_STATS;
    const updatedGatewayStats: GatewayPerformanceStats = {
      ...existingGatewayStats,
      totalEpochParticipationCount:
        existingGatewayStats.totalEpochParticipationCount + 1, // increment the total right away
    };

    // handle the case of no observations for the epoch by not rewarding the gateway
    if (!observations[epochStartHeight.valueOf()]?.reports) {
      updatedGateways[gatewayAddress] = {
        ...existingGateway,
        stats: updatedGatewayStats,
      };
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
      updatedGatewayStats.failedConsecutiveEpochs += 1;
      updatedGateways[gatewayAddress] = {
        ...existingGateway,
        stats: updatedGatewayStats,
      };
      // TODO: check if over count and remove from GAR!
      continue;
    }

    // update the passed epoch count
    updatedGatewayStats.passedEpochCount += 1;
    // reset its failed epoch count
    updatedGatewayStats.failedConsecutiveEpochs = 0;
    // assign it for a reward
    gatewaysToReward.push(gatewayAddress);
    // add it to our updated gateways
    updatedGateways[gatewayAddress] = {
      ...existingGateway,
      stats: updatedGatewayStats,
    };
  }

  // identify observers who reported the above gateways as eligible for rewards
  for (const observer of previouslyPrescribedObservers) {
    const existingGateway =
      updatedGateways[observer.gatewayAddress] ||
      gateways[observer.gatewayAddress];

    // unlikely - but don't continue
    if (!existingGateway) {
      continue;
    }

    const existingGatewayStats: GatewayPerformanceStats =
      existingGateway?.stats || DEFAULT_GATEWAY_PERFORMANCE_STATS;
    const updatedGatewayStats: GatewayPerformanceStats = {
      ...existingGatewayStats,
      totalEpochsPrescribedCount:
        existingGatewayStats?.totalEpochsPrescribedCount + 1, // increment the prescribed count right away
    };

    const observerSubmittedReportForEpoch =
      observations[epochStartHeight.valueOf()]?.reports[
        observer.observerAddress
      ];

    if (!observerSubmittedReportForEpoch) {
      updatedGateways[observer.gatewayAddress] = {
        ...existingGateway,
        stats: updatedGatewayStats,
      };
      continue;
    }

    // update the number of epochs this observer has passed
    updatedGatewayStats.submittedEpochCount += 1;

    // update the gateway stats
    updatedGateways[observer.gatewayAddress] = {
      ...existingGateway,
      stats: updatedGatewayStats,
    };

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

  const perObserverReward = Object.keys(previouslyPrescribedObservers).length
    ? Math.floor(
        totalPotentialObserverReward /
          Object.keys(previouslyPrescribedObservers).length,
      )
    : 0;

  // TODO: set thresholds for the perGatewayReward and perObserverReward to be greater than at least 1 mIO

  // distribute gateway tokens
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
      previouslyPrescribedObservers.some(
        (prescribed: WeightedObserver) =>
          prescribed.gatewayAddress === gatewayAddress,
      ) &&
      !observerGatewaysToReward.includes(gatewayAddress)
    ) {
      // you don't get the full gateway reward if you didn't submit a report
      totalGatewayReward = Math.floor(
        totalGatewayReward * (1 - BAD_OBSERVER_GATEWAY_PENALTY),
      );
    }

    // Split reward to delegates if applicable
    if (
      gateways[gatewayAddress].settings.allowDelegatedStaking === true && // Delegated staking disabled
      Object.keys(gateways[gatewayAddress].delegates).length && // No delegates to share with
      gateways[gatewayAddress].settings.delegateRewardShareRatio > 0 // Do not split rewards at all
    ) {
      // Track tokens for each delegated staker
      const tokensForDelegate: Record<WalletAddress, number> = {};
      let totalDistributed = 0;

      // Calculate the rewards to share between the gateway and delegates
      const gatewayRewardRatio =
        (100 - gateways[gatewayAddress].settings.delegateRewardShareRatio) /
          100 || 0;
      const gatewayRewardShare = Math.floor(
        totalGatewayReward * gatewayRewardRatio,
      );
      const delegateRewardShare = totalGatewayReward - gatewayRewardShare;
      // get reward amount for each delegate
      const totalDelegatedStake = gateways[gatewayAddress].delegatedStake;
      for (const delegateAddress in gateways[gatewayAddress].delegates) {
        const delegateData =
          gateways[gatewayAddress].delegates[delegateAddress];
        const delegateShare = delegateData.delegatedStake / totalDelegatedStake;
        tokensForDelegate[delegateAddress] = Math.floor(
          delegateRewardShare * delegateShare,
        );
        totalDistributed += tokensForDelegate[delegateAddress];
      }

      // Calculate the remaining tokens to distribute due to rounding
      let remainingTokens = delegateRewardShare - totalDistributed;
      while (remainingTokens > 0) {
        for (const delegateAddress in gateways[gatewayAddress].delegates) {
          if (remainingTokens === 0) {
            break;
          }
          tokensForDelegate[delegateAddress]++;
          remainingTokens--;
        }
      }

      // distribute gateway reward tokens to each delegate to their existing stake on this gateway
      // ensure the gateway's total delegated stake is updated each time
      for (const delegateAddress in tokensForDelegate) {
        safeDelegateDistribution({
          balances: updatedBalances,
          gateways: updatedGateways,
          protocolAddress: SmartWeave.contract.id,
          gatewayAddress,
          delegateAddress,
          qty: new IOToken(tokensForDelegate[delegateAddress]),
        });
      }
      // Give the rest to the gateway operator
      // TO DO: use autoStake setting
      safeTransfer({
        balances: updatedBalances,
        fromAddress: SmartWeave.contract.id,
        toAddress: gatewayAddress,
        qty: gatewayRewardShare,
      });
    } else {
      // gateway receives full reward
      safeTransfer({
        balances: updatedBalances,
        fromAddress: SmartWeave.contract.id,
        toAddress: gatewayAddress,
        qty: totalGatewayReward,
      });
    }
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

    // Split reward to delegates if applicable
    if (
      gateways[gatewayObservedAndPassed].settings.allowDelegatedStaking ===
        true && // Delegated staking disabled
      Object.keys(gateways[gatewayObservedAndPassed].delegates).length && // No delegates to share with
      gateways[gatewayObservedAndPassed].settings.delegateRewardShareRatio > 0 // Do not split rewards at all
    ) {
      // Track tokens for each delegated staker
      const tokensForDelegate: Record<WalletAddress, number> = {};
      let totalDistributed = 0;

      // Calculate the rewards to share between the gateway and delegates
      const observerRewardRatio =
        (100 -
          gateways[gatewayObservedAndPassed].settings
            .delegateRewardShareRatio) /
          100 || 0;
      const observerRewardShare = Math.floor(
        perObserverReward * observerRewardRatio,
      );
      const delegateRewardShare = perObserverReward - observerRewardShare;

      // get reward amount for each delegate
      const totalDelegatedStake =
        gateways[gatewayObservedAndPassed].delegatedStake;
      for (const delegateAddress in gateways[gatewayObservedAndPassed]
        .delegates) {
        const delegateData =
          gateways[gatewayObservedAndPassed].delegates[delegateAddress];
        const delegateShare = delegateData.delegatedStake / totalDelegatedStake;
        tokensForDelegate[delegateAddress] = Math.floor(
          delegateRewardShare * delegateShare,
        );
        totalDistributed += tokensForDelegate[delegateAddress];
      }

      // Calculate the remaining tokens to distribute due to rounding
      let remainingTokens = delegateRewardShare - totalDistributed;
      while (remainingTokens > 0) {
        for (const delegateAddress in gateways[gatewayObservedAndPassed]
          .delegates) {
          if (remainingTokens === 0) {
            break;
          }
          tokensForDelegate[delegateAddress]++;
          remainingTokens--;
        }
      }

      // distribute observer reward tokens to each delegate to their existing stake on this gateway
      // ensure the gateway's total delegated stake is updated each time
      for (const delegateAddress in tokensForDelegate) {
        safeDelegateDistribution({
          balances: updatedBalances,
          gateways: updatedGateways,
          protocolAddress: SmartWeave.contract.id,
          gatewayAddress: gatewayObservedAndPassed,
          delegateAddress,
          qty: new IOToken(tokensForDelegate[delegateAddress]),
        });
      }

      // give the rest to the gateway operator
      // TODO: Use autoStaking setting
      safeTransfer({
        balances: updatedBalances,
        fromAddress: SmartWeave.contract.id,
        toAddress: gatewayObservedAndPassed,
        qty: observerRewardShare,
      });
    } else {
      safeTransfer({
        balances: updatedBalances,
        fromAddress: SmartWeave.contract.id,
        toAddress: gatewayObservedAndPassed,
        qty: perObserverReward,
      });
    }
  }
  // avoids copying balances if not necessary
  const newBalances: Balances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  // update gateways
  const newGateways: Gateways = Object.keys(updatedGateways).length
    ? { ...gateways, ...updatedGateways }
    : gateways;

  const {
    epochStartHeight: nextEpochStartHeight,
    epochEndHeight: nextEpochEndHeight,
    epochDistributionHeight: nextDistributionHeight,
    epochPeriod,
  } = getEpochDataForHeight({
    currentBlockHeight: new BlockHeight(epochEndHeight.valueOf() + 1),
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  const updatedEpochData: EpochDistributionData = {
    // increment epoch variables to the next one - they should already be updated with the checks above
    epochStartHeight: nextEpochStartHeight.valueOf(),
    epochEndHeight: nextEpochEndHeight.valueOf(),
    epochZeroStartHeight: distributions.epochZeroStartHeight,
    nextDistributionHeight: nextDistributionHeight.valueOf(),
    epochPeriod: epochPeriod.valueOf(),
  };

  // now that we've updated stats, refresh our prescribed observers
  const updatedPrescribedObservers = await getPrescribedObserversForEpoch({
    gateways: newGateways,
    epochStartHeight: nextEpochStartHeight,
    epochEndHeight: nextEpochEndHeight,
    distributions: updatedEpochData,
    minOperatorStake: GATEWAY_REGISTRY_SETTINGS.minOperatorStake,
  });

  return {
    distributions: updatedEpochData,
    balances: newBalances,
    gateways: newGateways,
    prescribedObservers: {
      [nextEpochStartHeight.valueOf()]: updatedPrescribedObservers,
    },
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
