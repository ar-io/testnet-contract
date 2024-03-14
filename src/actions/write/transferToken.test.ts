import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
} from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { IOToken } from '../../types';
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
            qty: new IOToken(100).toMIO().valueOf(),
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
          test: new IOToken(99).toMIO().valueOf(),
        },
      };
      const error = await transferTokens(initialState, {
        caller: 'test',
        input: {
          qty: new IOToken(100).toMIO().valueOf(),
          target: stubbedArweaveTxId,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should transfer balances if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new IOToken(10_000).toMIO().valueOf(),
        },
      };
      const { state } = await transferTokens(initialState, {
        caller: 'test',
        input: {
          qty: new IOToken(100).valueOf(),
          target: stubbedArweaveTxId,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: new IOToken(9900).toMIO().valueOf(),
          [stubbedArweaveTxId]: new IOToken(100).toMIO().valueOf(),
        },
      });
    });
  });
});
