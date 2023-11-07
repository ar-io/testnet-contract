import {
  calculateMinimumAuctionBid,
  createAuctionObject,
} from '../../auctions';
import { PERMABUY_LEASE_FEE_LENGTH } from '../../constants';
import {
  calculateAnnualRenewalFee,
  calculateRegistrationFee,
  calculateUndernameCost,
} from '../../pricing';
import {
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  IOState,
} from '../../types';
import {
  assertAvailableRecord,
  calculateYearsBetweenTimestamps,
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
  }: { caller: string; input: { function: string; [x: string]: unknown } },
): number {
  // TODO: move all these to utility functions
  switch (input.function as InteractionsWithFee) {
    case 'buyRecord': {
      const { name, years, type, auction } = new BuyRecord(input);
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
      const fee = calculateRegistrationFee({
        name,
        fees: state.fees,
        type,
        years,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
        demandFactoring: state.demandFactoring,
      });
      return fee;
    }
    case 'submitAuctionBid': {
      const { name } = new AuctionBid(input);
      const auction = state.auctions[name];
      assertAvailableRecord({
        caller,
        name,
        records: state.records,
        reserved: state.reserved,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
      });
      // we don't return minimum au
      if (!auction) {
        const newAuction = createAuctionObject({
          name,
          currentBlockTimestamp: new BlockTimestamp(
            +SmartWeave.block.timestamp,
          ),
          currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
          fees: state.fees,
          auctionSettings: state.settings.auctions,
          demandFactoring: state.demandFactoring,
          type: 'lease',
          initiator: caller,
          contractTxId: SmartWeave.transaction.id,
        });
        return newAuction.floorPrice;
      }
      const fee = calculateMinimumAuctionBid({
        startHeight: new BlockHeight(auction.startHeight),
        currentBlockHeight: new BlockHeight(+SmartWeave.block.height),
        startPrice: auction.startPrice,
        floorPrice: auction.floorPrice,
        decayInterval: auction.settings.decayInterval,
        decayRate: auction.settings.decayRate,
      });
      return fee.valueOf();
    }
    case 'extendRecord': {
      const { name, years } = new ExtendRecord(input);
      const record = state.records[name];
      assertRecordCanBeExtended({
        record,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
        years,
      });
      const fee = calculateAnnualRenewalFee({ name, years, fees: state.fees });
      return fee;
    }
    case 'increaseUndernameCount': {
      const { name, qty } = new IncreaseUndernameCount(input);
      const record = state.records[name];
      assertRecordCanIncreaseUndernameCount({
        record,
        qty,
        currentBlockTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
      });
      const { endTimestamp, type } = record;
      const yearsRemaining = endTimestamp
        ? calculateYearsBetweenTimestamps({
            startTimestamp: new BlockTimestamp(+SmartWeave.block.timestamp),
            endTimestamp: new BlockTimestamp(endTimestamp),
          })
        : PERMABUY_LEASE_FEE_LENGTH;

      const fee = calculateUndernameCost({
        name,
        fees: state.fees,
        type,
        years: yearsRemaining,
        increaseQty: qty,
        demandFactoring: state.demandFactoring,
      });
      return fee;
    }
    default:
      throw new ContractError(
        `Invalid function provided. Available options are 'buyRecord', 'extendRecord', and 'increaseUndernameCount'.`,
      );
  }
}
