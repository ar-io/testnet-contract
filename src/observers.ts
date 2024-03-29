import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  MAXIMUM_OBSERVERS_PER_EPOCH,
  MAX_TENURE_WEIGHT,
  OBSERVERS_SAMPLED_BLOCKS_COUNT,
  OBSERVERS_SAMPLED_BLOCKS_OFFSET,
  TENURE_WEIGHT_PERIOD,
} from './constants';
import {
  BlockHeight,
  DeepReadonly,
  EpochDistributionData,
  Gateway,
  Gateways,
  WalletAddress,
  WeightedObserver,
  mIOToken,
} from './types';

export function getEpochDataForHeight({
  currentBlockHeight,
  epochBlockLength = new BlockHeight(EPOCH_BLOCK_LENGTH),
  epochZeroStartHeight,
}: {
  currentBlockHeight: BlockHeight;
  epochBlockLength?: BlockHeight;
  epochZeroStartHeight: BlockHeight;
}): {
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
  epochDistributionHeight: BlockHeight;
  epochPeriod: BlockHeight;
} {
  const epochIndexForCurrentBlockHeight = Math.floor(
    Math.max(
      0,
      (currentBlockHeight.valueOf() - epochZeroStartHeight.valueOf()) /
        epochBlockLength.valueOf(),
    ),
  );
  const epochStartHeight =
    epochZeroStartHeight.valueOf() +
    epochBlockLength.valueOf() * epochIndexForCurrentBlockHeight;

  const epochEndHeight = epochStartHeight + epochBlockLength.valueOf() - 1;
  const epochDistributionHeight = epochEndHeight + EPOCH_DISTRIBUTION_DELAY;

  return {
    epochStartHeight: new BlockHeight(epochStartHeight),
    epochEndHeight: new BlockHeight(epochEndHeight),
    epochDistributionHeight: new BlockHeight(epochDistributionHeight),
    epochPeriod: new BlockHeight(epochIndexForCurrentBlockHeight),
  };
}

// TODO: can we confidently us buffers here in non-node environments?
export async function getEntropyHashForEpoch({
  epochStartHeight,
}: {
  epochStartHeight: BlockHeight;
}): Promise<Buffer> {
  // used as we don't have access to Hash object in smartweave executions, so we concat our buffer and hash it at the end
  let bufferHash: Buffer = Buffer.from('');
  // We hash multiple previous block hashes to reduce the chance that someone will
  // influence the value produced by grinding with excessive hash power.
  for (let i = 0; i < OBSERVERS_SAMPLED_BLOCKS_COUNT; i++) {
    const blockHeight = Math.max(
      0,
      epochStartHeight.valueOf() - OBSERVERS_SAMPLED_BLOCKS_OFFSET - i,
    );
    const path = `/block/height/${blockHeight}`;
    const data = await SmartWeave.safeArweaveGet(path);
    const indep_hash = data.indep_hash;
    // TODO: add regex check on the indep_hash
    if (!indep_hash) {
      throw new ContractError(
        `Block ${blockHeight.valueOf()} has no indep_hash`,
      );
    }
    bufferHash = Buffer.concat([
      bufferHash,
      Buffer.from(indep_hash, 'base64url'),
    ]);
  }
  return SmartWeave.arweave.crypto.hash(bufferHash, 'SHA-256');
}

export function isGatewayLeaving({
  gateway,
  currentBlockHeight,
}: {
  gateway: DeepReadonly<Gateway>;
  currentBlockHeight: BlockHeight;
}): boolean {
  return (
    gateway.status === 'leaving' && gateway.end <= currentBlockHeight.valueOf()
  );
}

export function isGatewayEligibleForDistribution({
  epochStartHeight,
  epochEndHeight,
  gateway,
}: {
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
  gateway: DeepReadonly<Gateway> | undefined;
}): boolean {
  if (!gateway) return false;
  // gateway must have joined before the epoch started, as it affects weighting for distributions
  const didStartBeforeEpoch = gateway.start <= epochStartHeight.valueOf();
  // gateway must not be leaving before the end of the epoch - TODO: confirm this
  const didNotLeaveDuringEpoch = !isGatewayLeaving({
    gateway,
    currentBlockHeight: epochEndHeight,
  });
  return didStartBeforeEpoch && didNotLeaveDuringEpoch;
}

export function getEligibleGatewaysForEpoch({
  epochStartHeight,
  epochEndHeight,
  gateways,
}: {
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
  gateways: DeepReadonly<Gateways>;
}): Gateways {
  const eligibleGateways: Gateways = {};
  for (const [address, gateway] of Object.entries(gateways)) {
    if (
      isGatewayEligibleForDistribution({
        epochStartHeight,
        epochEndHeight,
        gateway,
      })
    ) {
      eligibleGateways[address] = gateway;
    }
  }
  return eligibleGateways;
}

export function getObserverWeightsForEpoch({
  gateways,
  epochStartHeight,
  minOperatorStake,
}: {
  gateways: DeepReadonly<Gateways>;
  epochStartHeight: BlockHeight;
  minOperatorStake: mIOToken;
}): WeightedObserver[] {
  const weightedObservers: WeightedObserver[] = [];
  let totalCompositeWeight = 0;
  // Get all eligible observers and assign weights
  for (const [address, gateway] of Object.entries(gateways)) {
    const stake = new mIOToken(
      gateway.operatorStake + gateway.totalDelegatedStake,
    ); // e.g. 100 - no cap to this
    const stakeWeightRatio = stake.valueOf() / minOperatorStake.valueOf(); // this is always greater than 1 as the minOperatorStake is always less than the stake
    // the percentage of the epoch the gateway was joined for before this epoch, if the gateway starts in the future this will be 0
    const gatewayStart = new BlockHeight(gateway.start);
    const totalBlocksForGateway = epochStartHeight.isGreaterThanOrEqualTo(
      gatewayStart,
    )
      ? epochStartHeight.minus(gatewayStart).valueOf()
      : -1;
    // TODO: should we increment by one here or are observers that join at the epoch start not eligible to be selected as an observer
    const calculatedTenureWeightForGateway =
      totalBlocksForGateway < 0
        ? 0
        : totalBlocksForGateway
        ? totalBlocksForGateway / TENURE_WEIGHT_PERIOD
        : 1 / TENURE_WEIGHT_PERIOD;
    // max of 4, which implies after 2 years, you are considered a mature gateway and this number stops increasing
    const gatewayTenureWeight = Math.min(
      calculatedTenureWeightForGateway,
      MAX_TENURE_WEIGHT,
    );

    // the percentage of epochs participated in that the gateway passed
    const totalEpochsGatewayPassed = gateway.stats.passedEpochCount || 0;
    const totalEpochsParticipatedIn =
      gateway.stats.totalEpochParticipationCount || 0;
    // default to 1 for gateways that have not participated in a full epoch
    const gatewayRewardRatioWeight =
      (1 + totalEpochsGatewayPassed) / (1 + totalEpochsParticipatedIn);

    // the percentage of epochs the observer was prescribed and submitted reports for
    const totalEpochsPrescribed = gateway.stats.totalEpochsPrescribedCount || 0;
    const totalEpochsSubmitted = gateway.stats.submittedEpochCount || 0;
    // defaults to one again if either are 0, encouraging new gateways to join and observe
    const observerRewardRatioWeight =
      (1 + totalEpochsSubmitted) / (1 + totalEpochsPrescribed);

    // calculate composite weight based on sub weights
    const compositeWeight =
      stakeWeightRatio *
      gatewayTenureWeight *
      gatewayRewardRatioWeight *
      observerRewardRatioWeight;

    weightedObservers.push({
      gatewayAddress: address,
      observerAddress: gateway.observerWallet,
      stake: stake.valueOf(),
      start: gateway.start,
      stakeWeight: stakeWeightRatio,
      tenureWeight: gatewayTenureWeight,
      gatewayRewardRatioWeight,
      observerRewardRatioWeight,
      compositeWeight,
      normalizedCompositeWeight: undefined, // set later once we have the total composite weight
    });
    // total weight for all eligible gateways
    totalCompositeWeight += compositeWeight;
  }

  // calculate the normalized composite weight for each observer - do not default to one as these are dependent on the total weights of all observers
  for (const weightedObserver of weightedObservers) {
    weightedObserver.normalizedCompositeWeight = totalCompositeWeight
      ? weightedObserver.compositeWeight / totalCompositeWeight
      : 0;
  }
  return weightedObservers;
}

export async function getPrescribedObserversForEpoch({
  gateways,
  epochStartHeight,
  epochEndHeight,
  minOperatorStake,
}: {
  gateways: DeepReadonly<Gateways>;
  distributions: DeepReadonly<EpochDistributionData>;
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
  minOperatorStake: mIOToken;
}): Promise<WeightedObserver[]> {
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  const weightedObservers = getObserverWeightsForEpoch({
    gateways: eligibleGateways,
    epochStartHeight,
    minOperatorStake,
    // filter out any that could have a normalized composite weight of 0 to avoid infinite loops when randomly selecting prescribed observers below
  }).filter((observer) => observer.normalizedCompositeWeight > 0); // TODO: this could be some required minimum weight

  // return all the observers if there are fewer than the number of observers per epoch
  if (MAXIMUM_OBSERVERS_PER_EPOCH >= weightedObservers.length) {
    return weightedObservers;
  }

  // deterministic way to get observers per epoch based on the epochs end height
  const blockHeightEntropyHash = await getEntropyHashForEpoch({
    epochStartHeight,
  });

  // note: this should always result to MAXIMUM_OBSERVERS_PER_EPOCH
  const prescribedObserversAddresses: Set<WalletAddress> = new Set();
  let hash = blockHeightEntropyHash; // our starting hash
  while (prescribedObserversAddresses.size < MAXIMUM_OBSERVERS_PER_EPOCH) {
    const random = hash.readUInt32BE(0) / 0xffffffff; // Convert hash to a value between 0 and 1
    let cumulativeNormalizedCompositeWeight = 0;
    for (const observer of weightedObservers) {
      // skip observers that have already been prescribed
      if (prescribedObserversAddresses.has(observer.gatewayAddress)) continue;
      // add the observers normalized composite weight to the cumulative weight
      cumulativeNormalizedCompositeWeight += observer.normalizedCompositeWeight;
      // if the random value is less than the cumulative weight, we have found our observer
      if (random <= cumulativeNormalizedCompositeWeight) {
        prescribedObserversAddresses.add(observer.gatewayAddress);
        break;
      }
      // Compute the next hash for the next iteration
      hash = await SmartWeave.arweave.crypto.hash(hash, 'SHA-256');
    }
  }

  const prescribedObservers: WeightedObserver[] = weightedObservers.filter(
    (observer) => prescribedObserversAddresses.has(observer.gatewayAddress),
  );
  return prescribedObservers.sort(
    (a, b) => a.normalizedCompositeWeight - b.normalizedCompositeWeight,
  );
}
