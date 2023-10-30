import { SECONDS_IN_A_YEAR } from './constants';
import { calculateRegistrationFee } from './pricing';
import {
  AuctionData,
  AuctionSettings,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  IOToken,
  RegistrationType,
} from './types';

export function calculateMinimumAuctionBid({
  startHeight,
  startPrice,
  floorPrice,
  currentBlockHeight,
  decayInterval,
  decayRate,
}: {
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
  currentBlockHeight: BlockHeight;
  decayInterval: number;
  decayRate: number;
}): IOToken {
  const blockIntervalsPassed = Math.max(
    0,
    Math.floor(
      (currentBlockHeight.valueOf() - startHeight.valueOf()) / decayInterval,
    ),
  );
  const dutchAuctionBid =
    startPrice * Math.pow(1 - decayRate, blockIntervalsPassed);
  // TODO: we shouldn't be rounding like this, use a separate class to handle the number of allowed decimals for IO values and use them here
  return new IOToken(Math.max(floorPrice, dutchAuctionBid));
}

export function getAuctionPrices({
  auctionSettings,
  startHeight,
  startPrice,
  floorPrice,
}: {
  auctionSettings: AuctionSettings;
  startHeight: BlockHeight;
  startPrice: number;
  floorPrice: number;
}): Record<number, number> {
  const { auctionDuration, decayRate, decayInterval } = auctionSettings;
  const intervalCount = auctionDuration / decayInterval;
  const prices: Record<number, number> = {};
  for (let i = 0; i <= intervalCount; i++) {
    const intervalHeight = new BlockHeight(
      startHeight.valueOf() + i * decayInterval,
    );
    const price = calculateMinimumAuctionBid({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: intervalHeight,
      decayInterval,
      decayRate,
    });
    prices[intervalHeight.valueOf()] = price.valueOf();
  }
  return prices;
}

export function createAuctionObject({
  auctionSettings,
  years,
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
  years: number;
  auctionSettings: AuctionSettings;
  contractTxId: string | undefined;
  currentBlockHeight: BlockHeight;
  currentBlockTimestamp: BlockTimestamp;
  type: RegistrationType;
  initiator: string | undefined;
  demandFactoring: DeepReadonly<DemandFactoringData>;
}): AuctionData {
  const initialRegistrationFee = calculateRegistrationFee({
    name,
    fees,
    years,
    type,
    currentBlockTimestamp,
    demandFactoring,
  });
  const calculatedFloorPrice =
    initialRegistrationFee * auctionSettings.floorPriceMultiplier;
  const startPrice =
    calculatedFloorPrice * auctionSettings.startPriceMultiplier;
  const endHeight =
    currentBlockHeight.valueOf() + auctionSettings.auctionDuration;
  return {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice,
    floorPrice: calculatedFloorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight.valueOf(), // auction starts right away
    endHeight, // auction ends after the set duration
    type,
    ...(years ? { years } : {}),
    settings: auctionSettings,
  };
}

export function getEndTimestampForAuction({
  auction,
  currentBlockTimestamp,
}: {
  auction: AuctionData;
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
