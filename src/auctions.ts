import { SECONDS_IN_A_YEAR } from './constants';
import { calculateRegistrationFee } from './pricing';
import {
  isActiveReservedName,
  isExistingActiveRecord,
  isShortNameRestricted,
} from './records';
import {
  ArNSAuctionData,
  ArNSBaseAuctionData,
  ArNSNameData,
  AuctionSettings,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  IOToken,
  RegistrationType,
  ReservedNameData,
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
  auctionSettings,
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
  auctionSettings: AuctionSettings;
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
    initialRegistrationFee * auctionSettings.floorPriceMultiplier;
  const startPrice =
    calculatedFloorPrice * auctionSettings.startPriceMultiplier;
  const endHeight =
    currentBlockHeight.valueOf() + auctionSettings.auctionDuration;

  const baseAuctionData: ArNSBaseAuctionData = {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice,
    floorPrice: calculatedFloorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight.valueOf(), // auction starts right away
    endHeight, // auction ends after the set duration
    type,
    settings: auctionSettings,
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

export function calculateExistingAuctionBidForCaller({
  caller,
  auction,
  submittedBid,
  requiredMinimumBid,
}: {
  caller: string;
  auction: ArNSAuctionData;
  submittedBid: number | undefined; // TODO: change to IOToken
  requiredMinimumBid: IOToken; // TODO: change to IOToken
}): IOToken {
  if (submittedBid && submittedBid < requiredMinimumBid.valueOf()) {
    throw new ContractError(
      `The bid (${submittedBid} IO) is less than the current required minimum bid of ${requiredMinimumBid.valueOf()} IO.`,
    );
  }

  let finalBid = submittedBid
    ? Math.min(submittedBid, requiredMinimumBid.valueOf())
    : requiredMinimumBid.valueOf();

  if (caller === auction.initiator) {
    finalBid -= auction.floorPrice;
  }
  return new IOToken(finalBid);
}

export function isNameAvailableForAuction({
  name,
  record,
  reservedName,
  caller,
  currentBlockTimestamp,
}: {
  name: string;
  record: ArNSNameData | undefined;
  caller: string;
  reservedName: ReservedNameData | undefined;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  return (
    !isExistingActiveRecord({ record, currentBlockTimestamp }) &&
    !isActiveReservedName({ reservedName, caller, currentBlockTimestamp }) &&
    !isShortNameRestricted({ name, currentBlockTimestamp })
  );
}

export function isNameRequiredToBeAuction({
  name,
  type,
}: {
  name: string;
  type: RegistrationType;
}): boolean {
  return type === 'permabuy' && name.length < 12;
}
