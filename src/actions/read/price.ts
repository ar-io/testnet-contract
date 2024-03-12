import {
  calculateAuctionPriceForBlock,
  createAuctionObject,
} from '../../auctions';
import { AUCTION_SETTINGS, PERMABUY_LEASE_FEE_LENGTH } from '../../constants';
import {
  calculateAnnualRenewalFee,
  calculateRegistrationFee,
  calculateUndernameCost,
} from '../../pricing';
import { assertAvailableRecord, isLeaseRecord } from '../../records';
import {
  BlockHeight,
  BlockTimestamp,
  ContractReadResult,
  DeepReadonly,
  IOState,
  mIOToken,
} from '../../types';
import { calculateYearsBetweenTimestamps } from '../../utilities';
import { BuyRecord } from '../write/buyRecord';
import { ExtendRecord, assertRecordCanBeExtended } from '../write/extendRecord';
import {
  IncreaseUndernameCount,
  assertRecordCanIncreaseUndernameCount,
} from '../write/increaseUndernameCount';
import { AuctionBid } from '../write/submitAuctionBid';

export type InteractionsWithFee =
  | 'buyRecord'
  | 'extendRecord'
  | 'increaseUndernameCount'
  | 'submitAuctionBid';

export function getPriceForInteraction(
  state: DeepReadonly<IOState>,
  {
    caller,
    input,
  }: {
    caller: string;
    input: { interactionName: InteractionsWithFee; [x: string]: unknown };
  },
): ContractReadResult {
  let fee: mIOToken;
  // overwrite function on the input so it does not fail on interaction specific validation
  const { interactionName: _, ...parsedInput } = {
    ...input,
    function: input.interactionName,
  };
  const interactionTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);
  const interactionHeight = new BlockHeight(+SmartWeave.block.height);
  // TODO: move all these to utility functions
  switch (input.interactionName) {
    case 'buyRecord': {
      const { name, years, type, auction } = new BuyRecord(parsedInput);
      // TODO: move this to util so we can call it directly rather than recalling this function
      if (auction) {
        return getPriceForInteraction(state, {
          caller,
          input: {
            ...input,
            function: 'submitAuctionBid',
          },
        });
      }
      assertAvailableRecord({
        caller,
        name,
        records: state.records,
        reserved: state.reserved,
        currentBlockTimestamp: interactionTimestamp,
        type,
        auction,
      });
      fee = calculateRegistrationFee({
        name,
        fees: state.fees,
        type,
        years,
        currentBlockTimestamp: interactionTimestamp,
        demandFactoring: state.demandFactoring,
      });
      break;
    }
    case 'submitAuctionBid': {
      const { name, type } = new AuctionBid(parsedInput);
      const auction = state.auctions[name];
      assertAvailableRecord({
        caller,
        name,
        records: state.records,
        reserved: state.reserved,
        currentBlockTimestamp: interactionTimestamp,
        type,
        auction: true,
      });
      // return the floor price to start the auction
      if (!auction) {
        const newAuction = createAuctionObject({
          name,
          currentBlockTimestamp: interactionTimestamp,
          currentBlockHeight: interactionHeight,
          fees: state.fees,
          demandFactoring: state.demandFactoring,
          type: 'lease',
          initiator: caller,
          contractTxId: SmartWeave.transaction.id,
        });
        fee = newAuction.floorPrice;
        break;
      }
      const minimumAuctionBid = calculateAuctionPriceForBlock({
        startHeight: new BlockHeight(auction.startHeight),
        currentBlockHeight: interactionHeight,
        startPrice: new mIOToken(auction.startPrice),
        floorPrice: new mIOToken(auction.floorPrice),
        auctionSettings: AUCTION_SETTINGS,
      });
      fee = minimumAuctionBid;
      break;
    }
    case 'extendRecord': {
      const { name, years } = new ExtendRecord(parsedInput);
      const record = state.records[name];
      assertRecordCanBeExtended({
        record,
        currentBlockTimestamp: interactionTimestamp,
        years,
      });
      fee = calculateAnnualRenewalFee({ name, years, fees: state.fees });
      break;
    }
    case 'increaseUndernameCount': {
      const { name, qty } = new IncreaseUndernameCount(parsedInput);
      const record = state.records[name];
      assertRecordCanIncreaseUndernameCount({
        record,
        qty,
        currentBlockTimestamp: interactionTimestamp,
      });
      const { type } = record;
      const endTimestamp = isLeaseRecord(record)
        ? record.endTimestamp
        : undefined;
      const yearsRemaining = endTimestamp
        ? calculateYearsBetweenTimestamps({
            startTimestamp: interactionTimestamp,
            endTimestamp: new BlockTimestamp(endTimestamp),
          })
        : PERMABUY_LEASE_FEE_LENGTH;

      fee = calculateUndernameCost({
        name,
        fees: state.fees,
        type,
        years: yearsRemaining,
        increaseQty: qty,
        demandFactoring: state.demandFactoring,
      });
      break;
    }
    default:
      throw new ContractError(
        `Invalid function provided. Available options are 'buyRecord', 'extendRecord', and 'increaseUndernameCount'.`,
      );
  }

  return {
    result: {
      input,
      price: fee.valueOf(),
    },
  };
}
