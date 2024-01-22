import { AUCTION_SETTINGS, FEES, SECONDS_IN_A_YEAR } from './constants';
import { calculateRegistrationFee } from './pricing';
import {
  ArNSAuctionData,
  ArNSBaseAuctionData,
  AuctionSettings,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  IOToken,
  RegistrationType,
} from './types';

export function calculateAuctionPriceForBlock({
  startHeight,
  startPrice,
  floorPrice,
  currentBlockHeight,
  scalingExponent,
  exponentialDecayRate,
}: {
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
  currentBlockHeight: BlockHeight;
  scalingExponent: number;
  exponentialDecayRate: number;
}): IOToken {
  const blocksSinceStart = currentBlockHeight.valueOf() - startHeight.valueOf();
  const decaySinceStart = exponentialDecayRate * blocksSinceStart;
  const dutchAuctionBid =
    startPrice * Math.pow(1 - decaySinceStart, scalingExponent);
  // TODO: we shouldn't be rounding like this, use a separate class to handle the number of allowed decimals for IO values and use them here
  return new IOToken(
    Math.min(startPrice, Math.max(floorPrice, dutchAuctionBid)),
  );
}

export function getAuctionPricesForInterval({
  auctionSettings,
  startHeight,
  startPrice,
  floorPrice,
  blocksPerInterval,
}: {
  auctionSettings: AuctionSettings;
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
  blocksPerInterval: number;
}): Record<number, number> {
  const { auctionDuration, exponentialDecayRate, scalingExponent } =
    auctionSettings;
  const prices: Record<number, number> = {};
  for (
    let intervalBlockHeight = 0;
    intervalBlockHeight <= auctionDuration;
    intervalBlockHeight += blocksPerInterval
  ) {
    const blockHeightForInterval = startHeight.valueOf() + intervalBlockHeight;
    const price = calculateAuctionPriceForBlock({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: new BlockHeight(blockHeightForInterval),
      exponentialDecayRate,
      scalingExponent,
    });
    prices[blockHeightForInterval] = price.valueOf();
  }
  return prices;
}

export function createAuctionObject({
  contractTxId,
  currentBlockHeight,
  currentBlockTimestamp,
  type,
  initiator,
  demandFactoring,
  name,
}: {
  name: string;
  contractTxId: string;
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  type: RegistrationType;
  initiator: string;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): ArNSAuctionData {
  const initialRegistrationFee = calculateRegistrationFee({
    name,
    fees: FEES,
    type,
    years: 1,
    currentBlockTimestamp,
    demandFactoring,
  });
  const { floorPriceMultiplier, startPriceMultiplier, auctionDuration } =
    AUCTION_SETTINGS;

  const calculatedFloorPrice = initialRegistrationFee * floorPriceMultiplier;
  const startPrice = calculatedFloorPrice * startPriceMultiplier;
  const endHeight = currentBlockHeight.valueOf() + auctionDuration;

  const baseAuctionData: ArNSBaseAuctionData = {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice,
    floorPrice: calculatedFloorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight.valueOf(), // auction starts right away
    endHeight, // auction ends after the set duration
    type,
    settings: AUCTION_SETTINGS,
  };
  switch (type) {
    case 'permabuy':
      return {
        ...baseAuctionData,
        type: 'permabuy',
      };
    case 'lease':
      return {
        ...baseAuctionData,
        years: 1,
        type: 'lease',
      };
    default:
      throw new ContractError('Invalid auction type');
  }
}

export function getEndTimestampForAuction({
  auction,
  currentBlockTimestamp,
}: {
  auction: ArNSAuctionData;
  currentBlockTimestamp: BlockTimestamp;
}): BlockTimestamp | undefined {
  switch (auction.type) {
    case 'permabuy':
      return undefined;
    case 'lease':
      return new BlockTimestamp(
        currentBlockTimestamp.valueOf() + SECONDS_IN_A_YEAR * auction.years,
      );
    default:
      throw new ContractError('Invalid auction type');
  }
}
