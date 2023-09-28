import {
  AuctionSettings,
  ContractResult,
  IOState,
  PstAction,
} from '../../types';
import {
  calculateMinimumAuctionBid,
  generateAuctionObject,
  getInvalidAjvMessage,
} from '../../utilities';
import { validateGetAuction } from '../../validations.mjs';

declare const SmartWeave: any;
declare const ContractError;

export class GetAuction {
  function = 'getAuction';
  name: string;

  constructor(input: any) {
    // validate using ajv validator
    if (!validateGetAuction(input)) {
      throw new ContractError(getInvalidAjvMessage(validateGetAuction, input));
    }
    const { name } = input;
    this.name = name.trim().toLowerCase();
  }
}

export const getAuction = (
  state: IOState,
  { caller, input }: PstAction,
): ContractResult => {
  const { name } = new GetAuction(input);
  const { auctions, settings, fees } = state;
  const auction = auctions[name.toLowerCase().trim()];

  if (!auction) {
    // No auction? generate the relevant auctions permutations for the name (lease lengths + permabuy)
    const currentAuctionSettings: AuctionSettings =
      settings.auctions.history.find(
        (a) => a.id === settings.auctions.current,
      )!;

    if (!currentAuctionSettings) {
      throw new ContractError(
        `Auction settings with id ${settings.auctions.current} do not exist.`,
      );
    }

    const { auctionSettingsId: _, ...auctionWithoutSettingsId } = auction;

    const auction = generateAuctionObject({
      name: name.toLowerCase().trim(),
      auctionSettings: currentAuctionSettings,
      blockHeight: +SmartWeave.block.height,
      blockTime: +SmartWeave.block.timestamp,
      caller,
      fees,
    });

    return {
      result: {
        ...auction,
        // something to signify this auction is not currently in the state
        isAvailableForAuction: true,
      },
    };
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
        isAvailableForAuction: false,
        isExpired: expirationHeight < +SmartWeave.block.height,
        settings: {
          id: auctionSettingsId,
          ...auctionSettings,
        },
        prices,
      },
    },
  };
};
