import { SECONDS_IN_A_YEAR } from '../../constants';
import { IOState } from '../../types';
import { getBaselineState } from '../write/submitAuctionBid.test';
import { getPriceForInteraction } from './price';

describe('getPriceForInteraction', () => {
  const state = getBaselineState();

  it.each([
    [
      'should return the correct price for buyRecord',
      state,
      {
        caller: 'test-caller',
        input: {
          function: 'buyRecord',
          name: 'test-buy-record',
          type: 'permabuy',
        },
      },
      500000,
    ],
    [
      'should return the correct price for extendRecord',
      {
        ...state,
        records: {
          'existing-record': {
            contractTxId: 'test-contract-tx-id',
            endTimestamp: Date.now() + SECONDS_IN_A_YEAR, // one years,
            type: 'lease',
            startTimestamp: Date.now(),
            undernames: 10,
            purchasePrice: 1000,
          },
        },
      } as IOState,
      {
        caller: 'test-caller',
        input: {
          function: 'extendRecord',
          name: 'existing-record',
          years: 1,
        },
      },
      50_000,
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
          function: 'increaseUndernameCount',
          name: 'existing-record',
          qty: 5,
        },
      },
      1250,
    ],
  ])(
    '%s',
    (
      _: string,
      inputState: IOState,
      inputData: {
        caller: string;
        input: { function: string; [x: string]: unknown };
      },
      expectedResult: number,
    ) => {
      const fee = getPriceForInteraction(inputState, inputData);
      expect(fee).toEqual(expectedResult);
    },
  );
});
