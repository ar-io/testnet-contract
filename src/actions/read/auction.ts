import { ContractResult, IOState, PstAction } from '../../types';
import { calculateMinimumAuctionBid } from '../../utilities';

declare const SmartWeave: any;
declare const ContractError;

export const getAuction = (
  state: IOState,
  { input: { name } }: PstAction,
): ContractResult => {
  const { auctions, settings } = state;
  const auction = auctions[name.toLowerCase().trim()];

  if (!auction) {
    throw new ContractError(
      `No live auction exists for ${name.toLowerCase().trim()}`,
    );
  }

  const { auctionSettingsId, startHeight, floorPrice, startPrice } = auction;
  const auctionSettings = settings.auctions.history.find(
    (a) => a.id === auctionSettingsId,
  );

  if (!auctionSettings) {
    throw new ContractError(
      `Auction settings with id ${auctionSettingsId} does not exist.`,
    );
  }

  const expirationHeight = startHeight + auctionSettings.auctionDuration;

  if (expirationHeight < +SmartWeave.block.height) {
    throw new ContractError('Auction is expired!');
  }

  const { auctionDuration, decayRate, decayInterval } = auctionSettings;
  const intervalCount = auctionDuration / decayInterval;
  const prices = {};
  for (let i = 0; i <= intervalCount; i++) {
    const intervalHeight = startHeight + i * decayInterval;
    const price = calculateMinimumAuctionBid({
      startHeight,
      startPrice,
      floorPrice,
      currentBlockHeight: intervalHeight,
      decayInterval,
      decayRate,
    });
    prices[intervalHeight] = price;
  }

  const { auctionSettingsId: _, ...auctionWithoutSettingsId } = auction;

  return {
    result: {
      auction: {
        ...auctionWithoutSettingsId,
        endHeight: expirationHeight,
        settings: {
          id: auctionSettingsId,
          ...auctionSettings,
        },
        prices,
      },
    },
  };
};
