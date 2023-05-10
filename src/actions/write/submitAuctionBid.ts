import {
  calculatePermabuyFee,
  calculateTotalRegistrationFee,
} from '@/utilities';

import {
  DEFAULT_INVALID_QTY_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_PERMABUY_EXPIRATION,
  DEFAULT_PERMABUY_TIER,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import {
  Auction,
  AuctionBidDetails,
  AuctionSettings,
  ContractResult,
  IOState,
  PstAction,
  ServiceTier,
  SubmitBidPayload,
  TokenVault,
  auctionTypes,
} from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Signals an approval for a proposed foundation action
export const submitAuctionBid = async (
  state: IOState,
  { caller, input: submitBidInput }: PstAction,
): Promise<ContractResult> => {
  // TODO: add a parser here to validate the input (e.g. zod or class-transformer/class-validator)
  const { auctions, fees, records, tiers, settings, balances, vaults } = state;

  const { name, qty, type, details } = submitBidInput as SubmitBidPayload;

  // validate name
  if (!name) {
    throw ContractError('Name is required.');
  }

  // validate type 
  if (!type || !auctionTypes.includes(type)) {
    throw ContractError('Invalid auction type.');
  }

  // validate at least a contract id was provided
  if (!details?.contractTxId) {
    throw ContractError('Contract transaction id is required.');
  }

  const formattedName = name.trim().toLowerCase();

  // already an owned name
  if (Object.keys(records).includes(formattedName)) {
    throw ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  // get the current auction settings, create one of it doesn't exist yet
  const currentAuctionSettings: AuctionSettings = settings.auctions.history.find(
    (a) => a.id === settings.auctions.current,
  );

  if(!currentAuctionSettings){
    throw Error('No auctions settings found.');
  }

  // validate we have tiers
  const currentTiers = tiers?.current
  const tierHistory = tiers?.history;

  if(!currentTiers || !tierHistory.length){
    throw Error('No tiers found.');
  }

  const bidDetails: AuctionBidDetails = {
    tierNumber: DEFAULT_PERMABUY_TIER,
    years: DEFAULT_PERMABUY_EXPIRATION,
    ...details,
  };

  // all the things we need to handle an auction bid
  const currentBlockHeight = +SmartWeave.block.height;
  const { decayInterval, decayRate, auctionDuration } = currentAuctionSettings;
  const walletVaults: TokenVault[] = vaults[caller] ?? [];

  // calculate the standard registration fee
  const serviceTier: ServiceTier = tierHistory.find(
    (t) => t.id === currentTiers[bidDetails.tierNumber],
  );
  const registrationFee =
    type === 'lease'
      ? calculateTotalRegistrationFee(
          formattedName,
          fees,
          serviceTier,
          bidDetails.years,
        )
      : calculatePermabuyFee(formattedName, fees, settings.permabuy.multiplier);

  // current auction in the state, validate the bid and update state
  if (Object.keys(auctions).includes(formattedName)) {
    const existingAuction: Auction = state.auctions[formattedName];
    const { startHeight, initialPrice, floorPrice, initiator } =
      existingAuction;

    const auctionEndHeight = startHeight + auctionDuration;
    const endTimestamp =
      existingAuction.type === 'lease'
        ? +SmartWeave.block.height + SECONDS_IN_A_YEAR * bidDetails.years
        : DEFAULT_PERMABUY_EXPIRATION;
    const tierNumber = existingAuction.details.tierNumber;
    if (
      startHeight > currentBlockHeight ||
      currentBlockHeight > auctionEndHeight
    ) {
      /**
       * We can update the state if a bid was placed after an auction has ended.
       *
       * To do so we need to:
       * 1. Remove the vault from the initiator
       * 2. Update the records to reflect their new name
       * 3. Return an error to the second bidder, telling them they did not win the bid.
       */

      // find the vault for this transaction and remove it
      let vaultRemoved = false;
      const updatedVaults = walletVaults
        .map((vault) => {
          if (!vaultRemoved && vault.balance === existingAuction.floorPrice) {
            vaultRemoved = true;
            return null;
          }
          return vault;
        })
        .filter((v) => !!v);
      if (!vaultRemoved) {
        // so no vault was found for the winning user. What do we do?
        throw Error('The auction has already been won.');
      }
      vaults[caller] = updatedVaults;

      // delete the auction
      delete auctions[formattedName];
      // update the state
      state.auctions = auctions;
      state.records = records;
      state.balances = balances;
      state.vaults = vaults;
      throw Error('The auction has already been won.');
    }

    // validate the bid
    const requiredMinimumBid = calculateMinimumAuctionBid({
      startHeight,
      initialPrice,
      floorPrice,
      currentBlockHeight,
      decayRate,
      decayInterval,
    });

    if (qty < requiredMinimumBid) {
      throw Error(
        `The bid (${qty} IO) is less than the current required minimum bid of ${requiredMinimumBid} IO.`,
      );
    }

    // throw an error if the wallet doesn't have the balance for the bid
    const validBalance = walletHasSufficientBalance(
      balances,
      caller,
      requiredMinimumBid,
    );
    if (!validBalance) {
      throw Error(DEFAULT_INVALID_QTY_MESSAGE);
    }

    /**
     * When a second bidder wins the bid, we can update the state completely to reflect the auction has been won.
     *
     * To do so we need to:
     * 1. Update the records
     * 2. Return the vault back to the initiator
     * 3. Decrement the balance of the secret bidder
     */

    // the bid has been won, update the records
    records[formattedName] = {
      contractTxId: bidDetails.contractTxId,
      type: existingAuction.type,
      endTimestamp: endTimestamp,
      tier: currentTiers[tierNumber],
    };

    // decrement the balance
    balances[caller] -= requiredMinimumBid;

    // return the vault balance to the initiator, nothing required to do with balances
    const initiatorVaults = vaults[initiator];
    const updatedInitiatorVaults = removeVaultFromWallet(
      initiatorVaults,
      existingAuction.floorPrice,
    );
    vaults[caller] = updatedInitiatorVaults;

    // delete the auction
    delete auctions[formattedName];
    state.vaults = vaults;
    state.auctions = auctions;
    state.records = records;
    return { state };
  }

  // no current auction, create one and vault the balance from the user
  if (!Object.keys(auctions).includes(formattedName)) {
    const {
      id: auctionSettingsID,
      floorPriceMultiplier,
      startPriceMultiplier,
    } = currentAuctionSettings;
    const floorPrice = Math.max(qty, registrationFee * floorPriceMultiplier);
    const initialPrice = registrationFee * startPriceMultiplier;

    // throw an error on invalid balance
    const validBalance = walletHasSufficientBalance(
      balances,
      caller,
      floorPrice,
    );
    if (!validBalance) {
      throw Error(DEFAULT_INVALID_QTY_MESSAGE);
    }

    // vault the users balance for the auction, remove the floor price from their current balance
    const auctionVault: TokenVault = {
      balance: floorPrice,
      start: currentBlockHeight,
      end: currentBlockHeight + auctionDuration, // TODO: we could set this to 0, or the end of the auction
    };
    walletVaults.push(auctionVault);
    vaults[caller] = walletVaults;
    balances[caller] -= floorPrice;

    // create the initial auction bid
    const initialAuctionBid = {
      auctionSettingsID,
      floorPrice,
      initialPrice,
      initiator: caller,
      details: bidDetails,
      // TODO: potentially increment by 1?
      startHeight: currentBlockHeight,
      type,
    };
    auctions[formattedName] = initialAuctionBid;

    // update the state to include the auction, notice not records have been updated
    state.auctions = auctions;
    state.vaults = vaults;
    state.balances = balances;
    return { state };
  }
};


export function calculateMinimumAuctionBid({
  startHeight,
  initialPrice,
  floorPrice,
  currentBlockHeight,
  decayInterval,
  decayRate,
}: {
  startHeight: number,
  initialPrice: number,
  floorPrice: number,
  currentBlockHeight: number,
  decayInterval: number,
  decayRate: number
}): number {
  const blockIntervalsPassed = Math.floor(
    (currentBlockHeight - startHeight) / decayInterval,
  );
  const dutchAuctionBid =
    initialPrice * Math.pow(decayRate, blockIntervalsPassed);
  const minimumBid = Math.max(dutchAuctionBid, floorPrice);
  return minimumBid;
}

export function walletHasSufficientBalance(
  balances: { [x: string]: number },
  wallet: string,
  qty: number,
): boolean {
  return balances[wallet] && balances[wallet] >= qty;
}

export function removeVaultFromWallet(
  vaults: TokenVault[],
  qty: number,
): TokenVault[] {
  let removedVault = false;
  return vaults.reduce((updatedVaults: TokenVault[], vault: TokenVault) => {
    // only removes the first occurrence of a vault matching the quantity specified
    if (!removedVault && vault.balance === qty) {
      removedVault = true;
      return updatedVaults;
    }
    updatedVaults.push(vault);
    return updatedVaults;
  }, []);
}
