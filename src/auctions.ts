import { AUCTION_SETTINGS, SECONDS_IN_A_YEAR } from './constants';
import { calculateRegistrationFee } from './pricing';
import {
  ArNSAuctionData,
  ArNSBaseAuctionData,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  IOToken,
  RegistrationType,
} from './types';

const { auctionDuration, exponentialDecayRate, scalingExponent } =
  AUCTION_SETTINGS;

export function calculateAuctionPriceForBlock({
  startHeight,
  startPrice,
  floorPrice,
  currentBlockHeight,
}: {
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
  currentBlockHeight: BlockHeight;
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
  startHeight,
  startPrice,
  floorPrice,
  blocksPerInterval,
}: {
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
  blocksPerInterval: number;
}): Record<number, number> {
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
    });
    prices[blockHeightForInterval] = price.valueOf();
  }
  return prices;
}

export function createAuctionObject({
  fees,
  contractTxId,
  currentBlockHeight,
  currentBlockTimestamp,
  type,
  initiator,
  demandFactoring,
  name,
}: {
  name: string;
  fees: Fees;
  contractTxId: string;
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  type: RegistrationType;
  initiator: string;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): ArNSAuctionData {
  const initialRegistrationFee = calculateRegistrationFee({
    name,
    fees,
    type,
    years: 1,
    currentBlockTimestamp,
    demandFactoring,
  });
  const calculatedFloorPrice =
    initialRegistrationFee * AUCTION_SETTINGS.floorPriceMultiplier;
  const startPrice =
    calculatedFloorPrice * AUCTION_SETTINGS.startPriceMultiplier;
  const endHeight =
    currentBlockHeight.valueOf() + AUCTION_SETTINGS.auctionDuration;

  const baseAuctionData: ArNSBaseAuctionData = {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice,
    floorPrice: calculatedFloorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight.valueOf(), // auction starts right away
    endHeight, // auction ends after the set duration
    type,
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
