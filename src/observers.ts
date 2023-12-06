import {
  BLOCKS_PER_DAY,
  DEFAULT_NUM_SAMPLED_BLOCKS,
  DEFAULT_SAMPLED_BLOCKS_OFFSET,
  MAX_TENURE_WEIGHT,
  NUM_OBSERVERS_PER_EPOCH,
  TENURE_WEIGHT_DAYS,
} from './constants';
import { BlockHeight, DeepReadonly, Gateways, WeightedObserver } from './types';

export function getEpochStart({
  startHeight,
  epochBlockLength,
  height,
}: {
  startHeight: BlockHeight;
  epochBlockLength: BlockHeight;
  height: BlockHeight;
}): BlockHeight {
  return new BlockHeight(
    getEpochEnd({ startHeight, epochBlockLength, height }).valueOf() +
      1 -
      epochBlockLength.valueOf(),
  );
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

export async function getEntropy(height: BlockHeight): Promise<Buffer> {
  let entropyBuffer: Buffer = Buffer.alloc(0);
  // We hash multiples block hashes to reduce the chance that someone will
  // influence the value produced by grinding with excessive hash power.
  for (let i = 0; i < DEFAULT_NUM_SAMPLED_BLOCKS; i++) {
    const offsetHeight =
      height.valueOf() - DEFAULT_SAMPLED_BLOCKS_OFFSET - i < 0
        ? 0
        : height.valueOf() - DEFAULT_SAMPLED_BLOCKS_OFFSET - i;
    const path = `/block/height/${offsetHeight}`;
    const data = await SmartWeave.safeArweaveGet(path);
    const indep_hash = data.indep_hash;
    if (!indep_hash || typeof indep_hash !== 'string') {
      throw new ContractError(
        `Block ${height.valueOf() - i} has no indep_hash`,
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

export async function getPrescribedObservers(
  gateways: DeepReadonly<Gateways>,
  minNetworkJoinStakeAmount: number,
  gatewayLeaveLength: number,
  height: BlockHeight,
): Promise<WeightedObserver[]> {
  const prescribedObservers: WeightedObserver[] = [];
  const weightedObservers: WeightedObserver[] = [];
  let totalCompositeWeight = 0;

  // Get all eligible observers and assign weights
  for (const address in gateways) {
    const gateway = gateways[address];

    // Check the conditions
    const isWithinStartRange = gateway.start <= height.valueOf();
    const isWithinEndRange =
      gateway.end === 0 || gateway.end - gatewayLeaveLength < height.valueOf();

    // Keep the gateway if it meets the conditions
    if (isWithinStartRange && isWithinEndRange) {
      const stake = gateways[address].operatorStake;
      const stakeWeight = stake / minNetworkJoinStakeAmount;
      let tenureWeight =
        (+SmartWeave.block.height - gateways[address].start) /
        (TENURE_WEIGHT_DAYS * BLOCKS_PER_DAY);

      if (tenureWeight > MAX_TENURE_WEIGHT) {
        tenureWeight = MAX_TENURE_WEIGHT;
      }

      // set reward ratio weights
      // TO DO AFTER REWARDS ARE IN!
      const gatewayRewardRatioWeight = 1;
      const observerRewardRatioWeight = 1;

      // calculate composite weight based on sub weights
      const compositeWeight =
        stakeWeight *
        tenureWeight *
        gatewayRewardRatioWeight *
        observerRewardRatioWeight;

      weightedObservers.push({
        gatewayAddress: address,
        observerAddress: gateway.observerWallet,
        stake,
        start: gateway.start,
        stakeWeight,
        tenureWeight,
        gatewayRewardRatioWeight,
        observerRewardRatioWeight,
        compositeWeight,
        normalizedCompositeWeight: compositeWeight,
      });
      totalCompositeWeight += compositeWeight;
    }
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

  const entropy = await getEntropy(height);
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
