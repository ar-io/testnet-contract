import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MAX_TOKEN_LOCK_BLOCK_LENGTH,
  MIN_TOKEN_LOCK_BLOCK_LENGTH,
} from '../../constants';
import { getBaselineState } from '../../tests/stubs';
import { IOToken } from '../../types';
import { createVault } from './createVault';

describe('createVault', () => {
  describe('invalid inputs', () => {
    it.each([['bad-qty', '0', 0, -1, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await createVault(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            lockLength: 100,
          },
        }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );

    it.each([
      [
        'bad-qty',
        '0',
        0,
        -1,
        MIN_TOKEN_LOCK_BLOCK_LENGTH - 1,
        MAX_TOKEN_LOCK_BLOCK_LENGTH + 1,
        Number.MAX_SAFE_INTEGER,
      ],
    ])(
      'should throw an error on invalid lockLength',
      async (badLockLength: unknown) => {
        const initialState = getBaselineState();
        const error = await createVault(initialState, {
          caller: 'test',
          input: {
            qty: 100,
            lockLength: badLockLength,
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
      const error = await createVault(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should create a vault in the state for the caller if it has a sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new IOToken(10_000).toMIO().valueOf(),
        },
      };
      const { state } = await createVault(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        vaults: {
          test: {
            [SmartWeave.transaction.id]: {
              balance: new IOToken(100).toMIO().valueOf(),
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_BLOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          },
        },
        balances: {
          test: new IOToken(9900).toMIO().valueOf(),
        },
      });
    });
  });
});
