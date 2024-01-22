import {
  calculateAuctionPriceForBlock,
  createAuctionObject,
} from '../../auctions';
import { FEES, PERMABUY_LEASE_FEE_LENGTH } from '../../constants';
import {
  calculateAnnualRenewalFee,
  calculateRegistrationFee,
  calculateUndernameCost,
} from '../../pricing';
import {
  BlockHeight,
  BlockTimestamp,
  ContractReadResult,
  DeepReadonly,
  IOState,
} from '../../types';
import {
  assertAvailableRecord,
  calculateYearsBetweenTimestamps,
  isLeaseRecord,
} from '../../utilities';
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
  let fee: number;
  // overwrite function on the input so it does not fail on interaction specific validation
  const { interactionName: _, ...parsedInput } = {
    ...input,
    function: input.interactionName,
  };
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
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
      });
      fee = calculateRegistrationFee({
        name,
        fees: FEES,
        type,
        years,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
        demandFactoring: state.demandFactoring,
      });
      break;
    }
    case 'submitAuctionBid': {
      const { name } = new AuctionBid(parsedInput);
      const auction = state.auctions[name];
      assertAvailableRecord({
        caller,
        name,
        records: state.records,
        reserved: state.reserved,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
      });
      // return the floor price to start the auction
      if (!auction) {
        const newAuction = createAuctionObject({
          name,
          currentBlockTimestamp: new BlockTimestamp(
            +SmartWeave.block.timestamp,
          ),
          currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
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
        currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
        startPrice: auction.startPrice,
        floorPrice: auction.floorPrice,
        scalingExponent: auction.settings.scalingExponent,
        exponentialDecayRate: auction.settings.exponentialDecayRate,
      });
      fee = minimumAuctionBid.valueOf();
      break;
    }
    case 'extendRecord': {
      const { name, years } = new ExtendRecord(parsedInput);
      const record = state.records[name];
      assertRecordCanBeExtended({
        record,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
        years,
      });
      fee = calculateAnnualRenewalFee({ name, years, fees: FEES });
      break;
    }
    case 'increaseUndernameCount': {
      const { name, qty } = new IncreaseUndernameCount(parsedInput);
      const record = state.records[name];
      assertRecordCanIncreaseUndernameCount({
        record,
        qty,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
      });
      const { type } = record;
      const endTimestamp = isLeaseRecord(record)
        ? record.endTimestamp
        : undefined;
      const yearsRemaining = endTimestamp
        ? calculateYearsBetweenTimestamps({
            startTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
            endTimestamp: new BlockTimestamp(endTimestamp),
          })
        : PERMABUY_LEASE_FEE_LENGTH;

      fee = calculateUndernameCost({
        name,
        fees: FEES,
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
      // TODO: make this mIO
      price: fee,
    },
  };
}
