import { GENESIS_FEES, SECONDS_IN_A_YEAR } from '../../constants';
import { getBaselineState } from '../../tests/stubs';
import { IOState, mIOToken } from '../../types';
import { InteractionsWithFee, getPriceForInteraction } from './price';

describe('getPriceForInteraction', () => {
  const state = getBaselineState();

  it.each([
    [
      'should return the correct price for buyRecord',
      state,
      {
        caller: 'test-caller',
        input: {
          interactionName: 'buyRecord' as InteractionsWithFee,
          name: 'test-buy-record',
          type: 'permabuy',
        },
      },
      new mIOToken(GENESIS_FEES['test-buy-record'.length]).plus(
        new mIOToken(
          // permabuy so 10 year annual renewal fee
          GENESIS_FEES['test-buy-record'.length],
        )
          .multiply(10)
          .multiply(0.2),
      ),
    ],
    [
      'should return the correct price for extendRecord',
      {
        ...state,
        records: {
          'existing-record': {
            contractTxId: 'test-contract-tx-id',
            endTimestamp: +SmartWeave.block.timestamp + SECONDS_IN_A_YEAR, // one years,
            type: 'lease',
            startTimestamp: +SmartWeave.block.timestamp,
            undernames: 10,
            purchasePrice: 1000,
          },
        },
      } as IOState,
      {
        caller: 'test-caller',
        input: {
          interactionName: 'extendRecord' as InteractionsWithFee,
          name: 'existing-record',
          years: 1,
        },
      },
      new mIOToken(50_000),
    ],
    [
      'should return the correct price for increaseUndernameCount',
      {
        ...state,
        records: {
          'existing-record': {
            contractTxId: 'test-contract-tx-id',
            endTimestamp: +SmartWeave.block.timestamp + SECONDS_IN_A_YEAR, // one year from the current block timestamp,
            type: 'lease',
            startTimestamp: +SmartWeave.block.timestamp,
            undernames: 10,
            purchasePrice: 1000,
          },
        },
      } as IOState,
      {
        caller: 'test-caller',
        input: {
          interactionName: 'increaseUndernameCount' as InteractionsWithFee,
          name: 'existing-record',
          qty: 5,
        },
      },
      new mIOToken(1250),
    ],
    [
      'should return the correct price for increaseUndernameCount',
      {
        ...state,
        records: {
          'existing-record': {
            contractTxId: 'test-contract-tx-id',
            type: 'permabuy',
            startTimestamp: +SmartWeave.block.timestamp,
            undernames: 10,
            purchasePrice: 1000,
          },
        },
      } as IOState,
      {
        caller: 'test-caller',
        input: {
          interactionName: 'increaseUndernameCount' as InteractionsWithFee,
          name: 'existing-record',
          qty: 5,
        },
      },
      new mIOToken(62500),
    ],
    [
      'should return the current bid for an existing auction and submitAuctionBid',
      {
        ...state,
        auctions: {
          'existing-auction': {
            startPrice: 1000,
            floorPrice: 1,
            startHeight: 0,
            endHeight: 10,
            initiator: 'initiator',
            contractTxId: 'atomic',
            type: 'lease',
            years: 1,
            settings: {
              scalingExponent: 10,
              exponentialDecayRate: 0.01,
              auctionDuration: 10,
              floorPriceMultiplier: 1,
              startPriceMultiplier: 10,
            },
          },
        },
      } as IOState,
      {
        caller: 'test-caller',
        input: {
          interactionName: 'submitAuctionBid' as InteractionsWithFee,
          name: 'existing-auction',
        },
      },
      new mIOToken(999),
    ],
    [
      'should return the floor price a new auction and submitAuctionBid',
      {
        ...state,
      },
      {
        caller: 'test-caller',
        input: {
          interactionName: 'submitAuctionBid' as InteractionsWithFee,
          name: 'new-auction',
        },
      },
      new mIOToken(GENESIS_FEES['new-auction'.length]).plus(
        // lease - so 1 year renewal fee
        new mIOToken(GENESIS_FEES['new-auction'.length]).multiply(0.2),
      ),
    ],
  ])(
    '%s',
    (
      _: string,
      inputState: IOState,
      inputData: {
        caller: string;
        input: { interactionName: InteractionsWithFee; [x: string]: unknown };
      },
      expectedResult: mIOToken,
    ) => {
      const { result } = getPriceForInteraction(inputState, inputData) as {
        result: { price: number; input: unknown };
      };
      expect(result.price).toEqual(expectedResult.valueOf());
      expect(result.input).toEqual(inputData.input);
    },
  );
});
