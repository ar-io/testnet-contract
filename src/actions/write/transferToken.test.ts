import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
} from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { mIOToken } from '../../types';
import { transferTokens } from './transferTokens';

describe('transferTokens', () => {
  describe('invalid inputs', () => {
    it.each([['bad-qty', '0', 0, -1, true, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await transferTokens(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            target: 'new-wallet',
          },
        }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );

    it.each([['not-an-address', '', '0', 0, -1, true]])(
      'should throw an error on invalid target',
      async (badTarget: unknown) => {
        const initialState = getBaselineState();
        const error = await transferTokens(initialState, {
          caller: 'test',
          input: {
            qty: new mIOToken(100).valueOf(),
            target: badTarget,
          },
        }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );

    it('should throw an error if the caller does not have sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new mIOToken(99).valueOf(),
        },
      };
      const error = await transferTokens(initialState, {
        caller: 'test',
        input: {
          qty: new mIOToken(100).valueOf(),
          target: stubbedArweaveTxId,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should transfer balances if the user has sufficient balance using IO denomination', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new mIOToken(10_000).valueOf(),
        },
      };
      const { state } = await transferTokens(initialState, {
        caller: 'test',
        input: {
          qty: new mIOToken(100).valueOf(),
          target: stubbedArweaveTxId,
          denomination: 'IO',
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: new mIOToken(9900).valueOf(),
          [stubbedArweaveTxId]: new mIOToken(100).valueOf(),
        },
      });
    });

    it.each([undefined, { denomination: 'mIO' }])(
      'should transfer balances if the user has sufficient balance using mIO denomination',
      async (denomination: { denomination: string } | undefined) => {
        const initialState = {
          ...getBaselineState(),
          balances: {
            test: new mIOToken(10_000).valueOf(),
          },
        };
        const { state } = await transferTokens(initialState, {
          caller: 'test',
          input: {
            qty: new mIOToken(100).valueOf(),
            target: stubbedArweaveTxId,
            ...denomination,
          },
        });
        expect(state).toEqual({
          ...initialState,
          balances: {
            test: new mIOToken(9900).valueOf(),
            [stubbedArweaveTxId]: new mIOToken(100).valueOf(),
          },
        });
      },
    );
  });
});
