import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MIN_TOKEN_LOCK_LENGTH,
} from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { transferTokensLocked } from './transferTokensLocked';

describe('transferTokensLocked', () => {
  describe('invalid inputs', () => {
    it.each([['bad-qty', '0', 0, -1, true, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await transferTokensLocked(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            target: 'new-wallet',
            lockLength: MIN_TOKEN_LOCK_LENGTH,
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
        const error = await transferTokensLocked(initialState, {
          caller: 'test',
          input: {
            qty: 100,
            target: badTarget,
            lockLength: MIN_TOKEN_LOCK_LENGTH,
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
          test: 99,
        },
      };
      const error = await transferTokensLocked(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should transfer locked if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: 10_000,
        },
      };
      const { state } = await transferTokensLocked(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: 9_900,
        },
        vaults: {
          [stubbedArweaveTxId]: [
            {
              balance: 100,
              start: 1,
              end: MIN_TOKEN_LOCK_LENGTH + 1,
            },
          ],
        },
      });
    });

    it('should transfer to second locked vault if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: 10_000,
        },
        vaults: {
          [stubbedArweaveTxId]: [
            {
              balance: 10,
              start: 0,
              end: MIN_TOKEN_LOCK_LENGTH,
            },
          ],
        },
      };
      const { state } = await transferTokensLocked(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: 9_900,
        },
        vaults: {
          [stubbedArweaveTxId]: [
            {
              balance: 10,
              start: 0,
              end: MIN_TOKEN_LOCK_LENGTH,
            },
            {
              balance: 100,
              start: 1,
              end: MIN_TOKEN_LOCK_LENGTH + 1,
            },
          ],
        },
      });
    });

    it('should transfer locked to self if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          [stubbedArweaveTxId]: 10_000,
        },
      };
      const { state } = await transferTokensLocked(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          [stubbedArweaveTxId]: 9_900,
        },
        vaults: {
          [stubbedArweaveTxId]: [
            {
              balance: 100,
              start: 1,
              end: MIN_TOKEN_LOCK_LENGTH + 1,
            },
          ],
        },
      });
    });

    it('should transfer locked to second vault for self if the user already has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          [stubbedArweaveTxId]: 10_000,
        },
        vaults: {
          [stubbedArweaveTxId]: [
            {
              balance: 10,
              start: 0,
              end: MIN_TOKEN_LOCK_LENGTH,
            },
          ],
        },
      };
      const { state } = await transferTokensLocked(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          [stubbedArweaveTxId]: 9_900,
        },
        vaults: {
          [stubbedArweaveTxId]: [
            {
              balance: 10,
              start: 0,
              end: MIN_TOKEN_LOCK_LENGTH,
            },
            {
              balance: 100,
              start: 1,
              end: MIN_TOKEN_LOCK_LENGTH + 1,
            },
          ],
        },
      });
    });
  });
});
