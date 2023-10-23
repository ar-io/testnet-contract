import {
  ARNS_NAME_IN_AUCTION_MESSAGE,
  ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE,
  ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_SHORT_NAME,
  INVALID_YEARS_MESSAGE,
  MAX_YEARS,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import {
  ContractResult,
  IOState,
  PstAction,
  RegistrationType,
} from '../../types';
import {
  calculateRegistrationFee,
  getInvalidAjvMessage,
  isActiveReservedName,
  isExistingActiveRecord,
  isNameRequiredToBeAuction,
  isShortNameRestricted,
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
  type: RegistrationType;
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
  const { balances, records, reserved, fees, auctions } = state;
  const { name, contractTxId, years, type, auction } = new BuyRecord(input); // does validation on constructor
  const currentBlockTimestamp = +SmartWeave.block.timestamp;

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

  if (
    isActiveReservedName({
      caller,
      reservedName: reserved[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
  }

  if (isShortNameRestricted({ name, currentBlockTimestamp })) {
    throw new ContractError(INVALID_SHORT_NAME);
  }

  if (
    isExistingActiveRecord({
      record: records[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(NON_EXPIRED_ARNS_NAME_MESSAGE);
  }

  if (isNameRequiredToBeAuction({ name, type })) {
    throw new ContractError(ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE);
  }

  // set the end lease period for this based on number of years if it's a lease
  const endTimestamp =
    type === 'lease'
      ? currentBlockTimestamp + SECONDS_IN_A_YEAR * years
      : undefined;

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

  // delete the reserved name if it exists
  if (reserved[name]) {
    delete state.reserved[name];
  }

  // update the records object
  state.records = records;
  state.reserved = reserved;
  state.balances = balances;
  return { state };
};
