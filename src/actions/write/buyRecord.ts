import {
  ARNS_NAME_IN_AUCTION_MESSAGE,
  ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_SHORT_NAME,
  INVALID_YEARS_MESSAGE,
  MAX_YEARS,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
} from '../../constants';
import { calculateRegistrationFee } from '../../registration';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  getInvalidAjvMessage,
  walletHasSufficientBalance,
} from '../../utilities';
// composed by ajv at build
import { validateBuyRecord } from '../../validations.mjs';
import { submitAuctionBid } from './submitAuctionBid';

declare const ContractError;
declare const SmartWeave: any;

export class BuyRecord {
  name: string;
  contractTxId: string;
  years: number;
  type: 'lease' | 'permabuy';
  auction: boolean;
  qty: number;

  constructor(input: any) {
    // validate using ajv validator
    if (!validateBuyRecord(input)) {
      throw new ContractError(getInvalidAjvMessage(validateBuyRecord, input));
    }
    const {
      name,
      contractTxId = RESERVED_ATOMIC_TX_ID,
      years = 1,
      type = 'lease',
      auction = false,
    } = input;
    this.name = name.trim().toLowerCase();
    (this.contractTxId =
      contractTxId === RESERVED_ATOMIC_TX_ID
        ? SmartWeave.transaction.id
        : contractTxId),
      (this.years = years);
    this.type = type;
    this.auction = auction;
  }
}

export const buyRecord = (
  state: IOState,
  { caller, input }: PstAction,
): ContractResult => {
  // get all other relevant state data
  const { balances, records, reserved, fees, auctions, owner } = state;
  const { name, contractTxId, years, type, auction } = new BuyRecord(input); // does validation on constructor
  const currentBlockTime = +SmartWeave.block.timestamp;

  // auction logic if auction flag set
  if (auction) {
    return submitAuctionBid(state, {
      caller,
      input,
    });
  } else if (auctions[name]) {
    // if auction flag not set, but auction exists, throw error
    throw new ContractError(ARNS_NAME_IN_AUCTION_MESSAGE);
  }

  // Check if the user has enough tokens to purchase the name
  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  // Additional check if it includes a valid number of years (TODO: this may be set in contract settings)
  if (years > MAX_YEARS) {
    throw new ContractError(INVALID_YEARS_MESSAGE);
  }

  if (reserved[name]) {
    const { target, endTimestamp: reservedEndTimestamp } = reserved[name];

    /**
     * Three scenarios:
     *
     * 1. name is reserved, regardless of length can be purchased only by target, unless expired
     * 2. name is reserved, but only for a certain amount of time
     * 3. name is reserved, with no target and no timestamp (i.e. target and timestamp are empty)
     */
    const handleReservedName = () => {
      const reservedByCaller = target === caller;
      const reservedExpired =
        reservedEndTimestamp &&
        reservedEndTimestamp <= +SmartWeave.block.timestamp;
      if (!reservedByCaller && !reservedExpired) {
        throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
      }

      delete reserved[name];
      return;
    };
    handleReservedName();
  } else {
    // not reserved but it's a short name, it can only be auctioned after the short name auction expiration date has passed
    const handleShortName = () => {
      /**
       * If a name is 1-4 characters, it can only be auctioned and after the set expiration.
       */
      if (
        name.length < MINIMUM_ALLOWED_NAME_LENGTH &&
        +SmartWeave.block.timestamp < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP &&
        !auction
      ) {
        throw new ContractError(INVALID_SHORT_NAME);
      }
      return;
    };
    handleShortName();
  }

  // set the end lease period for this based on number of years if it's a lease
  const endTimestamp =
    type === 'lease' ? currentBlockTime + SECONDS_IN_A_YEAR * years : undefined;

  // TODO: add dynamic pricing
  const totalRegistrationFee = calculateRegistrationFee({
    name,
    fees,
    years,
    type,
    currentBlockTimestamp: +SmartWeave.block.timestamp,
  });

  if (!walletHasSufficientBalance(balances, caller, totalRegistrationFee)) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${totalRegistrationFee} token(s)!`,
    );
  }

  // Check if the requested name exists on a lease and in a grace period
  if (
    records[name] &&
    records[name].type === 'lease' &&
    records[name].endTimestamp
  ) {
    const { endTimestamp } = records[name];
    if (
      endTimestamp &&
      endTimestamp + SECONDS_IN_GRACE_PERIOD > +SmartWeave.block.timestamp
    ) {
      // name is still on active lease during grace period
      throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
    }
  }

  // TODO: replace with protocol balance
  balances[caller] -= totalRegistrationFee;
  balances[SmartWeave.contract.id] += totalRegistrationFee;

  records[name] = {
    contractTxId,
    type,
    startTimestamp: +SmartWeave.block.timestamp,
    undernames: DEFAULT_UNDERNAME_COUNT,
    // only include timestamp on lease
    ...(type === 'lease' ? { endTimestamp } : {}),
  };

  // update the records object
  state.records = records;
  state.reserved = reserved;
  state.balances = balances;
  return { state };
};
