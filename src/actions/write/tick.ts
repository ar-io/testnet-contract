import {
  BAD_OBSERVER_GATEWAY_PENALTY,
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  DEFAULT_UNDERNAME_COUNT,
  DELEGATED_STAKE_UNLOCK_LENGTH,
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  EPOCH_REWARD_PERCENTAGE,
  GATEWAY_LEAVE_BLOCK_LENGTH,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  GATEWAY_REGISTRY_SETTINGS,
  INITIAL_EPOCH_DISTRIBUTION_DATA,
  MAXIMUM_OBSERVER_CONSECUTIVE_FAIL_COUNT,
  MIN_OPERATOR_STAKE,
  NETWORK_LEAVING_STATUS,
  OBSERVATION_FAILURE_THRESHOLD,
  OBSERVER_PERCENTAGE_OF_EPOCH_REWARD,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import {
  safeDelegateDistribution,
  safeGatewayStakeDistribution,
} from '../../distributions';
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
  DelegateData,
  Delegates,
  DemandFactoringData,
  EpochDistributionData,
  GatewayPerformanceStats,
  Gateways,
  IOState,
  Observations,
  PrescribedObservers,
  Records,
  RegistryVaults,
  ReservedNames,
  VaultData,
  Vaults,
  WalletAddress,
  WeightedObserver,
  mIOToken,
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
      const gateway = { ...gateways[key] };

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

        for (const vault of Object.values(gateway.vaults)) {
          incrementBalance(updatedBalances, key, new mIOToken(vault.balance));
        }
        // return any remaining operator stake
        if (gateway.operatorStake) {
          incrementBalance(
            updatedBalances,
            key,
            new mIOToken(gateway.operatorStake),
          );
        }
        // return any delegated stake
        for (const [delegateAddress, delegate] of Object.entries(
          gateway.delegates,
        )) {
          for (const vault of Object.values(delegate.vaults)) {
            // return the vault balance to the delegate and do not add back vault
            incrementBalance(
              updatedBalances,
              delegateAddress,
              new mIOToken(vault.balance),
            );
          }
          // return any remaining delegate stake
          if (delegate.delegatedStake) {
            incrementBalance(
              updatedBalances,
              delegateAddress,
              new mIOToken(delegate.delegatedStake),
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
          incrementBalance(updatedBalances, key, new mIOToken(vault.balance));
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
            incrementBalance(
              updatedBalances,
              delegateAddress,
              new mIOToken(vault.balance),
            );
          } else {
            // still an active vault so add it back
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

      // If the gateway has failed observation beyond the maximum allowable amount, it is marked as leaving
      // The gateway stake and all delegated stakes are vaulted and returned to their owners
      if (
        gateway.stats.failedConsecutiveEpochs >
          MAXIMUM_OBSERVER_CONSECUTIVE_FAIL_COUNT &&
        gateway.status !== NETWORK_LEAVING_STATUS
      ) {
        const interactionBlockHeight = new BlockHeight(
          +SmartWeave.block.height,
        );

        // set this gateway to leaving status and vault all gateway and delegate stakes
        const gatewayEndHeight = interactionBlockHeight.plus(
          GATEWAY_LEAVE_BLOCK_LENGTH,
        );
        const gatewayStakeWithdrawHeight = interactionBlockHeight.plus(
          GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength,
        );
        const delegateEndHeight = interactionBlockHeight.plus(
          DELEGATED_STAKE_UNLOCK_LENGTH,
        );

        // Add minimum staked tokens to a vault that unlocks after the gateway completely leaves the network
        updatedVaults[key] = {
          balance: MIN_OPERATOR_STAKE.valueOf(),
          start: interactionBlockHeight.valueOf(),
          end: gatewayEndHeight.valueOf(),
        };

        gateway.operatorStake -= MIN_OPERATOR_STAKE.valueOf();

        // If there are tokens remaining, add them to a vault that unlocks after the gateway stake withdrawal time
        if (gateway.operatorStake > 0) {
          updatedVaults[SmartWeave.transaction.id] = {
            balance: gateway.operatorStake,
            start: interactionBlockHeight.valueOf(),
            end: gatewayStakeWithdrawHeight.valueOf(),
          };
        }

        // Remove all tokens from the operator's stake
        gateway.operatorStake = 0;

        // Begin leave process by setting end dates to all vaults and the gateway status to leaving network
        gateway.end = gatewayEndHeight.valueOf();
        gateway.status = NETWORK_LEAVING_STATUS;

        // Add tokens from each delegate to a vault that unlocks after the delegate withdrawal period ends
        for (const address in updatedDelegates) {
          updatedDelegates[address].vaults[SmartWeave.transaction.id] = {
            balance: updatedDelegates[address].delegatedStake,
            start: interactionBlockHeight.valueOf(),
            end: delegateEndHeight.valueOf(),
          };

          // reduce gateway stake and set this delegate stake to 0
          gateway.totalDelegatedStake -=
            updatedDelegates[address].delegatedStake;
          updatedDelegates[address].delegatedStake = 0;
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
            incrementBalance(
              updatedBalances,
              address,
              new mIOToken(vault.balance),
            );
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
      new mIOToken(auction.floorPrice),
    );

    // update the demand factor
    const floorPrice = new mIOToken(auction.floorPrice);
    updatedDemandFactoring = tallyNamePurchase(
      updatedDemandFactoring,
      floorPrice,
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

  // distribution should only happen ONCE on block that is EPOCH_DISTRIBUTION_DELAY after the last completed epoch, do nothing if we are not there yet
  if (
    currentBlockHeight.valueOf() !== distributionHeightForLastEpoch.valueOf()
  ) {
    return {
      distributions,
      balances,
      gateways,
      prescribedObservers: prescribedObservers as PrescribedObservers,
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
      minOperatorStake: MIN_OPERATOR_STAKE,
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
  const totalPotentialReward = new mIOToken(
    Math.floor(currentProtocolBalance * EPOCH_REWARD_PERCENTAGE),
  );

  const totalPotentialGatewayReward = totalPotentialReward.multiply(
    GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  );

  if (Object.keys(eligibleGateways).length > 0) {
    // there may be a delta depending on the number of failures - it calculates this reward based on the number of distributions that should have passed
    // TODO: check that eligible gateways is not 0
    const perGatewayReward = totalPotentialGatewayReward.divide(
      Object.keys(eligibleGateways).length,
    );

    // distribute gateway tokens
    for (const gatewayAddress of gatewaysToReward) {
      const rewardedGateway = gateways[gatewayAddress];
      // add protocol balance if we do not have it
      if (!updatedBalances[SmartWeave.contract.id]) {
        updatedBalances[SmartWeave.contract.id] =
          balances[SmartWeave.contract.id] || 0;
      }

      // add the address if we do not have it
      if (!updatedBalances[gatewayAddress]) {
        updatedBalances[gatewayAddress] = balances[gatewayAddress] || 0;
      }

      let gatewayReward: mIOToken = perGatewayReward;
      // if you were prescribed observer but didn't submit a report, you get gateway reward penalized
      if (
        previouslyPrescribedObservers.some(
          (prescribed: WeightedObserver) =>
            prescribed.gatewayAddress === gatewayAddress,
        ) &&
        !observerGatewaysToReward.includes(gatewayAddress)
      ) {
        // you don't get the full gateway reward if you didn't submit a report
        gatewayReward = perGatewayReward.multiply(
          1 - BAD_OBSERVER_GATEWAY_PENALTY,
        );
      }

      // Split reward to delegates if applicable
      if (
        // Reminder: if an operator sets allowDelegatedStaking to false all delegates current stake get vaulted, and they cannot change it until those vaults are returned
        rewardedGateway.settings.allowDelegatedStaking &&
        Object.keys(rewardedGateway.delegates).length &&
        rewardedGateway.settings.delegateRewardShareRatio > 0 &&
        rewardedGateway.totalDelegatedStake > 0
      ) {
        let totalDistributedToDelegates = new mIOToken(0);
        let totalDelegatedStakeForEpoch = new mIOToken(0);
        // transfer tokens to each valid delegate based on their current delegated stake amount
        // Filter out delegates who joined before the epoch started
        // Calculate total amount of delegated stake for this gateway, excluding recently joined delegates
        const eligibleDelegates = Object.entries(
          rewardedGateway.delegates,
        ).reduce(
          (
            acc: Delegates,
            [address, delegateData]: [WalletAddress, DelegateData],
          ) => {
            if (delegateData.start <= epochStartHeight.valueOf()) {
              const delegatedStake = new mIOToken(delegateData.delegatedStake);
              totalDelegatedStakeForEpoch =
                totalDelegatedStakeForEpoch.plus(delegatedStake);
              acc[address] = delegateData;
            }
            return acc;
          },
          {},
        );

        // Calculate the rewards to share between the gateway and delegates
        const gatewayDelegatesTotalReward = gatewayReward.multiply(
          rewardedGateway.settings.delegateRewardShareRatio / 100,
        );

        // key based iteration
        for (const delegateAddress in eligibleDelegates) {
          const delegateData = rewardedGateway.delegates[delegateAddress];
          const delegatedStake = new mIOToken(delegateData.delegatedStake);
          const delegatedStakeRatio =
            delegatedStake.valueOf() / totalDelegatedStakeForEpoch.valueOf(); // this is a ratio, so do not use mIO
          const rewardForDelegate =
            gatewayDelegatesTotalReward.multiply(delegatedStakeRatio);

          if (rewardForDelegate.valueOf() < 1) {
            // if the reward is less than 1, don't bother
            continue;
          }

          safeDelegateDistribution({
            balances: updatedBalances,
            gateways: updatedGateways,
            protocolAddress: SmartWeave.contract.id,
            gatewayAddress,
            delegateAddress,
            qty: rewardForDelegate,
          });
          totalDistributedToDelegates =
            totalDistributedToDelegates.plus(rewardForDelegate);
        }
        // rounding down distributed tokens may cause there to be some left over - make sure it goes to the operator
        const remainingTokensForOperator = gatewayReward.minus(
          totalDistributedToDelegates,
        );

        // Give the rest to the gateway operator
        if (gateways[gatewayAddress].settings.autoStake) {
          safeGatewayStakeDistribution({
            balances: updatedBalances,
            gateways: updatedGateways,
            protocolAddress: SmartWeave.contract.id,
            gatewayAddress,
            qty: remainingTokensForOperator,
          });
        } else {
          safeTransfer({
            balances: updatedBalances,
            fromAddress: SmartWeave.contract.id,
            toAddress: gatewayAddress,
            qty: remainingTokensForOperator,
          });
        }
      } else {
        // gateway receives full reward
        if (gateways[gatewayAddress].settings.autoStake) {
          safeGatewayStakeDistribution({
            balances: updatedBalances,
            gateways: updatedGateways,
            protocolAddress: SmartWeave.contract.id,
            gatewayAddress,
            qty: gatewayReward,
          });
        } else {
          safeTransfer({
            balances: updatedBalances,
            fromAddress: SmartWeave.contract.id,
            toAddress: gatewayAddress,
            qty: gatewayReward,
          });
        }
      }
    }
  }

  const totalPotentialObserverReward = totalPotentialReward.multiply(
    OBSERVER_PERCENTAGE_OF_EPOCH_REWARD,
  );

  if (Object.keys(previouslyPrescribedObservers).length > 0) {
    // calculate the observer reward
    const perObserverReward = totalPotentialObserverReward.divide(
      Object.keys(previouslyPrescribedObservers).length,
    );
    // distribute observer tokens
    for (const gatewayObservedAndPassed of observerGatewaysToReward) {
      const rewardedGateway = gateways[gatewayObservedAndPassed];
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

      if (
        // TODO: move this to a utility function
        rewardedGateway.settings.allowDelegatedStaking &&
        Object.keys(rewardedGateway.delegates).length &&
        rewardedGateway.settings.delegateRewardShareRatio > 0
      ) {
        let totalDistributedToDelegates = new mIOToken(0);

        // transfer tokens to each valid delegate based on their current delegated stake amount
        // Filter out delegates who joined before the epoch started
        // Calculate total amount of delegated stake for this gateway, excluding recently joined delegates
        let totalDelegatedStakeForEpoch = new mIOToken(0);
        const eligibleDelegates = Object.entries(
          rewardedGateway.delegates,
        ).reduce(
          (
            acc: Delegates,
            [address, delegateData]: [WalletAddress, DelegateData],
          ) => {
            if (delegateData.start <= epochStartHeight.valueOf()) {
              const delegatedStake = new mIOToken(delegateData.delegatedStake);
              totalDelegatedStakeForEpoch =
                totalDelegatedStakeForEpoch.plus(delegatedStake);
              acc[address] = delegateData;
            }
            return acc;
          },
          {},
        );

        // Calculate the rewards to share between the gateway and delegates
        const gatewayDelegatesTotalReward = perObserverReward.multiply(
          rewardedGateway.settings.delegateRewardShareRatio / 100,
        );

        // key based iteration
        for (const delegateAddress in eligibleDelegates) {
          const delegateData = rewardedGateway.delegates[delegateAddress];
          const delegatedStake = new mIOToken(delegateData.delegatedStake);
          const delegatedStakeRatio =
            delegatedStake.valueOf() / totalDelegatedStakeForEpoch.valueOf(); // this is a ratio, so do not use mIO
          const rewardForDelegate =
            gatewayDelegatesTotalReward.multiply(delegatedStakeRatio);

          if (rewardForDelegate.valueOf() < 1) {
            continue;
          }

          safeDelegateDistribution({
            balances: updatedBalances,
            gateways: updatedGateways,
            protocolAddress: SmartWeave.contract.id,
            gatewayAddress: gatewayObservedAndPassed,
            delegateAddress,
            qty: rewardForDelegate,
          });
          totalDistributedToDelegates =
            totalDistributedToDelegates.plus(rewardForDelegate);
        }
        const remainingTokensForOperator = perObserverReward.minus(
          totalDistributedToDelegates,
        );

        // Give the rest to the gateway operator
        if (gateways[gatewayObservedAndPassed].settings.autoStake) {
          safeGatewayStakeDistribution({
            balances: updatedBalances,
            gateways: updatedGateways,
            protocolAddress: SmartWeave.contract.id,
            gatewayAddress: gatewayObservedAndPassed,
            qty: remainingTokensForOperator,
          });
        } else {
          safeTransfer({
            balances: updatedBalances,
            fromAddress: SmartWeave.contract.id,
            toAddress: gatewayObservedAndPassed,
            qty: remainingTokensForOperator,
          });
        }
      } else {
        // gateway receives full reward
        if (gateways[gatewayObservedAndPassed].settings.autoStake) {
          safeGatewayStakeDistribution({
            balances: updatedBalances,
            gateways: updatedGateways,
            protocolAddress: SmartWeave.contract.id,
            gatewayAddress: gatewayObservedAndPassed,
            qty: perObserverReward,
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
    }
  }
  // avoids copying balances if not necessary
  const newBalances: Balances = Object.keys(updatedBalances).length
    ? { ...balances, ...updatedBalances }
    : balances;

  // update gateways
  const newGateways: Gateways = Object.keys(updatedGateways).length
    ? { ...gateways, ...updatedGateways }
    : (gateways as Gateways);

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
    minOperatorStake: MIN_OPERATOR_STAKE,
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
