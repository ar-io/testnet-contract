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
  WeightedObserver,
} from './types';

export function getEpochBoundariesForHeight({
  currentBlockHeight,
  epochBlockLength = new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  epochZeroBlockHeight,
}: {
  currentBlockHeight: BlockHeight;
  epochBlockLength?: BlockHeight;
  epochZeroBlockHeight: BlockHeight;
}): {
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
} {
  const epochIndexForCurrentBlockHeight = Math.floor(
    currentBlockHeight.valueOf() / epochBlockLength.valueOf(),
  );
  const epochStartHeight =
    epochZeroBlockHeight.valueOf() +
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
  // We hash multiples block hashes to reduce the chance that someone will
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
  const weightedObservers: WeightedObserver[] = [];
  let totalCompositeWeight = 0;

  // filter out gateways eligible for epoch distribution
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  // Get all eligible observers and assign weights
  for (const [address, eligibleGateway] of Object.entries(eligibleGateways)) {
    const stake = eligibleGateway.operatorStake;
    const stakeWeight = stake / minNetworkJoinStakeAmount; // this has to be > 1 to joint he network

    // the percentage of the epoch the gateway was joined for before this epoch
    const totalBlocksForGateway =
      epochStartHeight.valueOf() - eligibleGateway.start;
    const calculatedTenureWeightForGateway =
      totalBlocksForGateway / TENURE_WEIGHT_TOTAL_BLOCK_COUNT; // do not default to 0
    const gatewayTenureWeight = Math.min(
      calculatedTenureWeightForGateway,
      MAX_TENURE_WEIGHT,
    );

    // the percentage of epochs participated in that the gateway passed
    const totalEpochsParticipatedIn =
      distributions.gateways[address]?.totalEpochParticipationCount || 0;
    const totalEpochsGatewayPassed =
      distributions.gateways[address]?.passedEpochCount || 0;
    const gatewayRewardRatioWeight = totalEpochsParticipatedIn
      ? totalEpochsGatewayPassed / totalEpochsParticipatedIn
      : 1;

    // the percentage of epochs the observer was prescribed and submitted reports for
    const totalEpochsPrescribed =
      distributions.observers[address]?.totalEpochsPrescribedCount || 0;
    const totalEpochsSubmitted =
      distributions.observers[address]?.submittedEpochCount || 0;
    const observerRewardRatioWeight = totalEpochsPrescribed
      ? totalEpochsSubmitted / totalEpochsPrescribed
      : 1;

    // TODO: should all of these default to one?
    // calculate composite weight based on sub weights
    const compositeWeight =
      stakeWeight *
        gatewayTenureWeight *
        gatewayRewardRatioWeight *
        observerRewardRatioWeight || 1;

    weightedObservers.push({
      gatewayAddress: address,
      observerAddress: eligibleGateway.observerWallet,
      stake,
      start: eligibleGateway.start,
      stakeWeight,
      tenureWeight: gatewayTenureWeight,
      gatewayRewardRatioWeight,
      observerRewardRatioWeight,
      compositeWeight,
      normalizedCompositeWeight: compositeWeight,
    });
    totalCompositeWeight += compositeWeight;
  }

  // calculate the normalized composite weight for each observer - do not default to one as these are dependent on the total weights of all observers
  for (const weightedObserver of weightedObservers) {
    weightedObserver.normalizedCompositeWeight = totalCompositeWeight
      ? weightedObserver.compositeWeight / totalCompositeWeight
      : 0;
  }

  // return all the observers if there are fewer than the number of observers per epoch
  if (MAXIMUM_OBSERVERS_PER_EPOCH >= Object.keys(weightedObservers).length) {
    return weightedObservers;
  }

  // deterministic way to get observers per epoch based on the epochs end height
  const blockHeightEntropyHash = await getEntropyHashForEpoch({
    epochStartHeight,
  });

  const prescribedObservers: Set<WeightedObserver> = new Set();
  let hash = blockHeightEntropyHash; // our starting hash
  for (let i = 0; i < MAXIMUM_OBSERVERS_PER_EPOCH; i++) {
    const random = hash.readUInt32BE(0) / 0xffffffff; // Convert hash to a value between 0 and 1
    let cumulativeNormalizedCompositeWeight = 0;
    for (const observer of weightedObservers) {
      // skip observers that have already been prescribed
      if (prescribedObservers.has(observer)) continue;
      // add the observers normalized composite weight to the cumulative weight
      cumulativeNormalizedCompositeWeight += observer.normalizedCompositeWeight;
      // if the random value is less than the cumulative weight, we have found our observer
      if (random <= cumulativeNormalizedCompositeWeight) {
        prescribedObservers.add(observer);
        break;
      }
      // Compute the next hash for the next iteration
      hash = await SmartWeave.arweave.crypto.hash(hash, 'SHA-256');
    }
  }
  return [...prescribedObservers];
}
