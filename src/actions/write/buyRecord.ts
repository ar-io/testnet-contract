import {
  ARNS_NAME_IN_AUCTION_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { calculateRegistrationFee, tallyNamePurchase } from '../../pricing';
import { assertAvailableRecord } from '../../records';
import { safeTransfer } from '../../transfer';
import {
  BlockTimestamp,
  ContractWriteResult,
  IOState,
  PstAction,
  RegistrationType,
} from '../../types';
import {
  getInvalidAjvMessage,
  walletHasSufficientBalance,
} from '../../utilities';
// composed by ajv at build
import { validateBuyRecord } from '../../validations';
import { submitAuctionBid } from './submitAuctionBid';

export class BuyRecord {
  name: string;
  contractTxId: string;
  years: number;
  type: RegistrationType;
  auction: boolean;

  constructor(input: any) {
    // validate using ajv validator
    if (!validateBuyRecord(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateBuyRecord, input, 'buyRecord'),
      );
    }
    const {
      name,
      contractTxId = RESERVED_ATOMIC_TX_ID,
      years = 1,
      type = 'lease',
      auction = false,
    } = input;
    this.name = name.trim().toLowerCase();
    this.contractTxId =
      contractTxId === RESERVED_ATOMIC_TX_ID
        ? SmartWeave.transaction.id
        : contractTxId;
    this.years = years;
    this.type = type;
    this.auction = auction;
  }
}

export const buyRecord = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  // get all other relevant state data
  const { balances, records, reserved, fees, auctions } = state;
  const { name, contractTxId, years, type, auction } = new BuyRecord(input); // does validation on constructor
  const currentBlockTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);

  // auction logic if auction flag set
  if (auction) {
    return submitAuctionBid(state, {
      caller,
      input,
    });
  }

  if (auctions[name]) {
    // if auction flag not set, but auction exists, throw error
    throw new ContractError(ARNS_NAME_IN_AUCTION_MESSAGE);
  }

  assertAvailableRecord({
    caller,
    name,
    records,
    reserved,
    currentBlockTimestamp,
    type,
    auction,
  });

  const totalRegistrationFee = calculateRegistrationFee({
    name,
    fees,
    years,
    type,
    currentBlockTimestamp,
    demandFactoring: state.demandFactoring,
  });

  if (!walletHasSufficientBalance(balances, caller, totalRegistrationFee)) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${totalRegistrationFee} token(s)!`,
    );
  }

  safeTransfer({
    balances,
    fromAddress: caller,
    toAddress: SmartWeave.contract.id,
    qty: totalRegistrationFee,
  });

  switch (type) {
    case 'permabuy':
      records[name] = {
        contractTxId,
        type,
        startTimestamp: +SmartWeave.block.timestamp,
        undernames: DEFAULT_UNDERNAME_COUNT,
        purchasePrice: totalRegistrationFee.valueOf(),
      };
      break;
    case 'lease':
      records[name] = {
        contractTxId,
        type,
        startTimestamp: +SmartWeave.block.timestamp,
        undernames: DEFAULT_UNDERNAME_COUNT,
        purchasePrice: totalRegistrationFee.valueOf(),
        // set the end lease period for this based on number of years if it's a lease
        endTimestamp:
          currentBlockTimestamp.valueOf() + SECONDS_IN_A_YEAR * years,
      };
      break;
  }

  // delete the reserved name if it exists
  if (reserved[name]) {
    delete state.reserved[name];
  }

  state.demandFactoring = tallyNamePurchase(
    state.demandFactoring,
    totalRegistrationFee,
  );

  return { state };
};
