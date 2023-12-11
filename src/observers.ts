import {
  BLOCKS_PER_DAY,
  DEFAULT_NUM_SAMPLED_BLOCKS,
  DEFAULT_SAMPLED_BLOCKS_OFFSET,
  GATEWAY_LEAVE_LENGTH,
  MAX_TENURE_WEIGHT,
  NUM_OBSERVERS_PER_EPOCH,
  TENURE_WEIGHT_DAYS,
} from './constants';
import {
  BlockHeight,
  DeepReadonly,
  Gateway,
  Gateways,
  WeightedObserver,
} from './types';

export function getEpochBoundaries({
  lastCompletedEpoch,
  epochBlockLength,
}: {
  lastCompletedEpoch: BlockHeight;
  epochBlockLength: BlockHeight;
}): {
  startHeight: BlockHeight;
  endHeight: BlockHeight;
} {
  return {
    startHeight: new BlockHeight(lastCompletedEpoch.valueOf() + 1),
    endHeight: new BlockHeight(
      lastCompletedEpoch.valueOf() + epochBlockLength.valueOf(),
    ),
  };
}

export function getEpochEnd({
  startHeight,
  epochBlockLength,
  height,
}: {
  startHeight: BlockHeight;
  epochBlockLength: BlockHeight;
  height: BlockHeight;
}): BlockHeight {
  return new BlockHeight(
    startHeight.valueOf() +
      epochBlockLength.valueOf() *
        (Math.floor(
          (height.valueOf() - startHeight.valueOf()) /
            epochBlockLength.valueOf(),
        ) +
          1) -
      1,
  );
}

// TODO: can we confidently us buffers here in non-node environments?
export async function getEntropyForEpoch(
  epochEndHeight: BlockHeight,
): Promise<Buffer> {
  let entropyBuffer: Buffer = Buffer.alloc(0);
  // We hash multiples block hashes to reduce the chance that someone will
  // influence the value produced by grinding with excessive hash power.
  const hashedBlockHeightEnd =
    epochEndHeight.valueOf() - DEFAULT_SAMPLED_BLOCKS_OFFSET;
  const hashedBlockHeightStart =
    hashedBlockHeightEnd - DEFAULT_NUM_SAMPLED_BLOCKS;
  for (
    let hashedBlockHeight = hashedBlockHeightStart;
    hashedBlockHeight < hashedBlockHeightEnd;
    hashedBlockHeight++
  ) {
    const path = `/block/height/${hashedBlockHeight}`;
    const data = await SmartWeave.safeArweaveGet(path);
    const indep_hash = data.indep_hash;
    if (!indep_hash || typeof indep_hash !== 'string') {
      throw new ContractError(
        `Block ${hashedBlockHeight.valueOf()} has no indep_hash`,
      );
    }
    entropyBuffer = Buffer.concat([
      entropyBuffer,
      Buffer.from(indep_hash, 'base64url'),
    ]);
  }
  const hash = await SmartWeave.arweave.crypto.hash(entropyBuffer, 'SHA-256');
  return hash;
}

export function isGatewayLeaving({
  gateway,
  currentBlockHeight,
}: {
  gateway: DeepReadonly<Gateway>;
  currentBlockHeight: BlockHeight;
}): boolean {
  return (
    gateway.status === 'leaving' &&
    gateway.end - GATEWAY_LEAVE_LENGTH <= currentBlockHeight.valueOf()
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
  // TODO: should a gateway be eligible if it's hidden?
  if (!gateway) return false;
  const isWithinStartRange = gateway.start <= epochStartHeight.valueOf();
  if (isGatewayLeaving({ gateway, currentBlockHeight: epochEndHeight })) {
    return false;
  }
  // there may be way to consolidate this
  const isWithinEndRange = gateway.end === 0;
  return isWithinStartRange && isWithinEndRange;
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
  minNetworkJoinStakeAmount,
  epochStartHeight,
  epochEndHeight,
}: {
  gateways: DeepReadonly<Gateways>;
  minNetworkJoinStakeAmount: number;
  epochStartHeight: BlockHeight;
  epochEndHeight: BlockHeight;
}): Promise<WeightedObserver[]> {
  const prescribedObservers: WeightedObserver[] = [];
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
    const stakeWeight = stake / minNetworkJoinStakeAmount;

    // calculate gateway weight with a max value
    const totalBlocksForGateway =
      epochEndHeight.valueOf() - eligibleGateway.start;
    const calculatedTenureWeightForGateway =
      totalBlocksForGateway / (TENURE_WEIGHT_DAYS * BLOCKS_PER_DAY);
    const gatewayTenureWeight = Math.min(
      calculatedTenureWeightForGateway,
      MAX_TENURE_WEIGHT,
    );

    // set reward ratio weights
    // TO DO AFTER REWARDS ARE IN!
    const gatewayRewardRatioWeight = 1;
    const observerRewardRatioWeight = 1;

    // calculate composite weight based on sub weights
    const compositeWeight =
      stakeWeight *
      gatewayTenureWeight *
      gatewayRewardRatioWeight *
      observerRewardRatioWeight;

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

  // calculate the normalized composite weight for each observer
  for (const weightedObserver of weightedObservers) {
    weightedObserver.normalizedCompositeWeight =
      weightedObserver.compositeWeight / totalCompositeWeight;
  }

  // If we want to source more observers than exist in the list, just return all eligible observers
  if (NUM_OBSERVERS_PER_EPOCH >= Object.keys(weightedObservers).length) {
    return weightedObservers;
  }

  // deterministic way to get observers per epoch
  const entropy = await getEntropyForEpoch(epochEndHeight);
  const usedIndexes = new Set<number>();
  let hash = await SmartWeave.arweave.crypto.hash(entropy, 'SHA-256');
  for (let i = 0; i < NUM_OBSERVERS_PER_EPOCH; i++) {
    const random = hash.readUInt32BE(0) / 0xffffffff; // Convert hash to a value between 0 and 1
    let cumulativeNormalizedCompositeWeight = 0;
    for (let index = 0; index < weightedObservers.length; index++) {
      {
        cumulativeNormalizedCompositeWeight +=
          weightedObservers[index].normalizedCompositeWeight;
        if (random <= cumulativeNormalizedCompositeWeight) {
          if (!usedIndexes.has(index)) {
            prescribedObservers.push(weightedObservers[index]);
            usedIndexes.add(index);
            break;
          }
        }
      }
      // Compute the next hash for the next iteration
      hash = await SmartWeave.arweave.crypto.hash(hash, 'SHA-256');
    }
  }
  return prescribedObservers;
}
