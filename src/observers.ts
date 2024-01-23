import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_NUM_SAMPLED_BLOCKS,
  DEFAULT_SAMPLED_BLOCKS_OFFSET,
  MAXIMUM_OBSERVERS_PER_EPOCH,
  MAX_TENURE_WEIGHT,
  TENURE_WEIGHT_TOTAL_BLOCK_COUNT,
} from './constants';
import {
  BlockHeight,
  DeepReadonly,
  Gateway,
  Gateways,
  RewardDistributions,
  WalletAddress,
  WeightedObserver,
} from './types';

export function getEpochBoundariesForHeight({
  currentBlockHeight,
  epochBlockLength = new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  epochZeroStartHeight,
}: {
  currentBlockHeight: BlockHeight;
  epochBlockLength?: BlockHeight;
  epochZeroStartHeight: BlockHeight;
}): {
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
} {
  const epochIndexForCurrentBlockHeight = Math.floor(
    (currentBlockHeight.valueOf() - epochZeroStartHeight.valueOf()) /
      epochBlockLength.valueOf(),
  );
  const epochStartHeight =
    epochZeroStartHeight.valueOf() +
    epochBlockLength.valueOf() * epochIndexForCurrentBlockHeight;
  return {
    epochStartHeight: new BlockHeight(epochStartHeight),
    epochEndHeight: new BlockHeight(
      epochStartHeight + epochBlockLength.valueOf() - 1,
    ),
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
  for (let i = 0; i < DEFAULT_NUM_SAMPLED_BLOCKS; i++) {
    const blockHeight = Math.max(
      0,
      epochStartHeight.valueOf() - DEFAULT_SAMPLED_BLOCKS_OFFSET - i,
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
  const didStartBeforeEpoch = gateway.start < epochStartHeight.valueOf();
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
  distributions,
  epochStartHeight,
  minNetworkJoinStakeAmount,
}: {
  gateways: DeepReadonly<Gateways>;
  distributions: DeepReadonly<RewardDistributions>;
  epochStartHeight: BlockHeight;
  minNetworkJoinStakeAmount: number; // TODO: replace with constant
}): WeightedObserver[] {
  const weightedObservers: WeightedObserver[] = [];
  let totalCompositeWeight = 0;
  // Get all eligible observers and assign weights
  for (const [address, gateway] of Object.entries(gateways)) {
    const stake = gateway.operatorStake; // e.g. 100 - no cap to this
    const stakeWeight = stake / minNetworkJoinStakeAmount; // this is always greater than 1 as the minNetworkJoinStakeAmount is always less than the stake

    // the percentage of the epoch the gateway was joined for before this epoch
    const totalBlocksForGateway = epochStartHeight.valueOf() - gateway.start;
    const calculatedTenureWeightForGateway =
      totalBlocksForGateway / TENURE_WEIGHT_TOTAL_BLOCK_COUNT; // TODO: change this variable name to be period
    // max of 4, which implies after 2 years, you are considered a mature gateway and this number stops increasing
    const gatewayTenureWeight = Math.min(
      calculatedTenureWeightForGateway,
      MAX_TENURE_WEIGHT,
    );

    // the percentage of epochs participated in that the gateway passed
    const totalEpochsGatewayPassed =
      distributions.gateways[address]?.passedEpochCount || 0;
    const totalEpochsParticipatedIn =
      distributions.gateways[address]?.totalEpochParticipationCount || 0;
    // default to 1 for gateways that have not participated in a full epoch
    const gatewayRewardRatioWeight =
      (1 + totalEpochsGatewayPassed) / (1 + totalEpochsParticipatedIn);

    // the percentage of epochs the observer was prescribed and submitted reports for
    const totalEpochsPrescribed =
      distributions.observers[address]?.totalEpochsPrescribedCount || 0;
    const totalEpochsSubmitted =
      distributions.observers[address]?.submittedEpochCount || 0;
    // defaults to one again if either are 0, encouraging new gateways to join and observe
    const observerRewardRatioWeight =
      (1 + totalEpochsSubmitted) / (1 + totalEpochsPrescribed);

    // calculate composite weight based on sub weights
    const compositeWeight =
      stakeWeight *
      gatewayTenureWeight *
      gatewayRewardRatioWeight *
      observerRewardRatioWeight;

    // this should never happen - but necessary to avoid any potential infinite loops when prescribing gateways below
    if (compositeWeight === 0) continue;

    weightedObservers.push({
      gatewayAddress: address,
      observerAddress: gateway.observerWallet,
      stake,
      start: gateway.start,
      stakeWeight,
      tenureWeight: gatewayTenureWeight,
      gatewayRewardRatioWeight,
      observerRewardRatioWeight,
      compositeWeight,
      normalizedCompositeWeight: compositeWeight,
    });
    // total weight for all eligible gateways
    totalCompositeWeight += compositeWeight;
  }

  // should also never happen, but protection against any potential infinite loops and protects against dividing by zero when setting normalized weights
  if (totalCompositeWeight === 0) return [];

  // calculate the normalized composite weight for each observer - do not default to one as these are dependent on the total weights of all observers
  for (const weightedObserver of weightedObservers) {
    weightedObserver.normalizedCompositeWeight =
      weightedObserver.compositeWeight / totalCompositeWeight;
  }

  return weightedObservers;
}

export async function getPrescribedObserversForEpoch({
  gateways,
  distributions,
  minNetworkJoinStakeAmount,
  epochStartHeight,
  epochEndHeight,
}: {
  gateways: DeepReadonly<Gateways>;
  distributions: DeepReadonly<RewardDistributions>;
  minNetworkJoinStakeAmount: number;
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
}): Promise<WeightedObserver[]> {
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  const weightedObservers = getObserverWeightsForEpoch({
    gateways: eligibleGateways,
    distributions,
    epochStartHeight,
    minNetworkJoinStakeAmount,
  });

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
