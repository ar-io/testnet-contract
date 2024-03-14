import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MIN_TOKEN_LOCK_BLOCK_LENGTH,
} from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { IOToken } from '../../types';
import { vaultedTransfer } from './vaultedTransfer';

describe('vaultedTransfer', () => {
  describe('invalid inputs', () => {
    it.each([['bad-qty', '0', 0, -1, true, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await vaultedTransfer(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            target: 'new-wallet',
            lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
          },
        }).catch((e: any) => e);
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
        const error = await vaultedTransfer(initialState, {
          caller: 'test',
          input: {
            qty: new IOToken(100).valueOf(),
            target: badTarget,
            lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
          },
        }).catch((e: any) => e);
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
      const error = await vaultedTransfer(initialState, {
        caller: 'test',
        input: {
          qty: new IOToken(100).valueOf(),
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      }).catch((e: any) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should transfer locked if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new IOToken(10000).toMIO().valueOf(),
        },
      };
      const { state } = await vaultedTransfer(initialState, {
        caller: 'test',
        input: {
          qty: new IOToken(100).valueOf(),
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: new IOToken(9900).toMIO().valueOf(),
        },
        vaults: {
          [stubbedArweaveTxId]: {
            [SmartWeave.transaction.id]: {
              balance: new IOToken(100).toMIO().valueOf(),
              start: 1,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH + 1,
            },
          },
        },
      });
    });

    it('should transfer to second locked vault if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new IOToken(10_000).toMIO().valueOf(),
        },
        vaults: {
          test: {
            'existing-vault-id': {
              balance: new IOToken(10).toMIO().valueOf(),
              start: 0,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
            },
          },
        },
      };
      const { state } = await vaultedTransfer(initialState, {
        caller: 'test',
        input: {
          qty: new IOToken(100).valueOf(),
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: new IOToken(9900).toMIO().valueOf(),
        },
        vaults: {
          [stubbedArweaveTxId]: {
            [SmartWeave.transaction.id]: {
              balance: new IOToken(100).toMIO().valueOf(),
              start: 1,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH + 1,
            },
          },
          test: {
            'existing-vault-id': {
              balance: new IOToken(10).toMIO().valueOf(),
              start: 0,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
            },
          },
        },
      });
    });

    it('should transfer locked to self if the user has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: new IOToken(10_000).toMIO().valueOf(),
        },
      };
      const { state } = await vaultedTransfer(initialState, {
        caller: 'test',
        input: {
          qty: new IOToken(100).valueOf(),
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: new IOToken(9900).toMIO().valueOf(),
        },
        vaults: {
          [stubbedArweaveTxId]: {
            [SmartWeave.transaction.id]: {
              balance: new IOToken(100).toMIO().valueOf(),
              start: 1,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH + 1,
            },
          },
        },
      });
    });

    it('should transfer locked to second vault for self if the user already has sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          [stubbedArweaveTxId]: new IOToken(10_000).toMIO().valueOf(),
        },
        vaults: {
          [stubbedArweaveTxId]: {
            'existing-vault-id': {
              balance: new IOToken(10).toMIO().valueOf(),
              start: 0,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
            },
          },
        },
      };
      const { state } = await vaultedTransfer(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: new IOToken(100).valueOf(),
          target: stubbedArweaveTxId,
          lockLength: MIN_TOKEN_LOCK_BLOCK_LENGTH,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          [stubbedArweaveTxId]: new IOToken(9900).toMIO().valueOf(),
        },
        vaults: {
          [stubbedArweaveTxId]: {
            [SmartWeave.transaction.id]: {
              balance: new IOToken(100).toMIO().valueOf(),
              start: 1,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH + 1,
            },
            'existing-vault-id': {
              balance: new IOToken(10).toMIO().valueOf(),
              start: 0,
              end: MIN_TOKEN_LOCK_BLOCK_LENGTH,
            },
          },
        },
      });
    });
  });
});
