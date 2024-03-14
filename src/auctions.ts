import { AUCTION_SETTINGS, SECONDS_IN_A_YEAR } from './constants';
import { calculateRegistrationFee } from './pricing';
import {
  isActiveReservedName,
  isExistingActiveRecord,
  isShortNameRestricted,
} from './records';
import {
  ArNSAuctionData,
  ArNSNameData,
  AuctionSettings,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Fees,
  RegistrationType,
  ReservedNameData,
  mIOToken,
} from './types';

export function calculateAuctionPriceForBlock({
  startHeight,
  startPrice,
  floorPrice,
  currentBlockHeight,
  auctionSettings = AUCTION_SETTINGS,
}: {
  startHeight: BlockHeight;
  startPrice: mIOToken;
  floorPrice: mIOToken;
  currentBlockHeight: BlockHeight;
  auctionSettings: AuctionSettings;
}): mIOToken {
  const blocksSinceStart = currentBlockHeight.valueOf() - startHeight.valueOf();
  const decaySinceStart =
    auctionSettings.exponentialDecayRate * blocksSinceStart;
  const dutchAuctionBid = startPrice.multiply(
    Math.pow(1 - decaySinceStart, auctionSettings.scalingExponent),
  );
  const defaultMinimumBid = floorPrice.isGreaterThan(dutchAuctionBid)
    ? floorPrice
    : dutchAuctionBid;
  return startPrice.isLessThan(defaultMinimumBid)
    ? startPrice
    : defaultMinimumBid;
}

export function getAuctionPricesForInterval({
  startHeight,
  startPrice,
  floorPrice,
  blocksPerInterval,
  auctionSettings = AUCTION_SETTINGS,
}: {
  startHeight: BlockHeight;
  startPrice: mIOToken;
  floorPrice: mIOToken;
  blocksPerInterval: number;
  auctionSettings: AuctionSettings;
}): Record<number, number> {
  const prices: Record<number, number> = {};
  for (
    let intervalBlockHeight = 0;
    intervalBlockHeight <= auctionSettings.auctionDuration;
    intervalBlockHeight += blocksPerInterval
  ) {
    const blockHeightForInterval = startHeight.valueOf() + intervalBlockHeight;
    const price = calculateAuctionPriceForBlock({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: new BlockHeight(blockHeightForInterval),
      auctionSettings,
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
}): {
  startPrice: mIOToken;
  floorPrice: mIOToken;
  startHeight: BlockHeight;
  endHeight: BlockHeight;
  type: RegistrationType;
  years?: number;
  initiator: string;
  contractTxId: string;
} {
  const initialRegistrationFee = calculateRegistrationFee({
    name,
    fees,
    type,
    years: 1,
    currentBlockTimestamp,
    demandFactoring,
  });
  const calculatedFloorPrice = initialRegistrationFee.multiply(
    AUCTION_SETTINGS.floorPriceMultiplier,
  );
  const startPrice = calculatedFloorPrice.multiply(
    AUCTION_SETTINGS.startPriceMultiplier,
  );
  const endHeight = currentBlockHeight.plus(
    new BlockHeight(AUCTION_SETTINGS.auctionDuration),
  );

  const baseAuctionData = {
    initiator, // the balance that the floor price is decremented from
    contractTxId,
    startPrice: startPrice,
    floorPrice: calculatedFloorPrice, // this is decremented from the initiators wallet, and could be higher than the precalculated floor
    startHeight: currentBlockHeight, // auction starts right away
    endHeight: endHeight, // auction ends after the set duration
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

export function calculateExistingAuctionBidForCaller({
  caller,
  auction,
  submittedBid,
  requiredMinimumBid,
}: {
  caller: string;
  auction: ArNSAuctionData;
  submittedBid: mIOToken | undefined;
  requiredMinimumBid: mIOToken;
}): mIOToken {
  if (submittedBid && submittedBid.isLessThan(requiredMinimumBid)) {
    throw new ContractError(
      `The bid (${submittedBid} IO) is less than the current required minimum bid of ${requiredMinimumBid.valueOf()} IO.`,
    );
  }
  if (caller === auction.initiator) {
    const floorPrice = new mIOToken(auction.floorPrice);
    return requiredMinimumBid.minus(floorPrice);
  }
  return requiredMinimumBid;
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
