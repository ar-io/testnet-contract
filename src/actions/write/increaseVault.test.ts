import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MIN_TOKEN_LOCK_BLOCK_LENGTH,
} from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { IOState } from '../../types';
import { increaseVault } from './increaseVault';

describe('increaseVault', () => {
  it.each([['bad-qty', undefined, '0', 0, -1, Number.MAX_SAFE_INTEGER]])(
    'should throw an error on invalid qty',
    async (badQty: unknown) => {
      const initialState: IOState = {
        ...getBaselineState(),
        vaults: {
          test: {
            'existing-vault-id': {
              balance: 100,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_BLOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          },
        },
      };
      const error = await increaseVault(initialState, {
        caller: 'test',
        input: {
          id: stubbedArweaveTxId,
          qty: badQty,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INVALID_INPUT_MESSAGE),
      );
    },
  );

  it('should throw an error if the caller does not have a vault with the provided id', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        test: 100,
      },
    };
    const error = await increaseVault(initialState, {
      caller: 'test',
      input: {
        id: stubbedArweaveTxId,
        qty: 50,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual('Invalid vault ID.');
  });

  it('should throw an error if the caller does not have sufficient balance', async () => {
    const initialState = {
      ...getBaselineState(),
      balances: {
        test: 99,
      },
      vaults: {
        test: {
          [stubbedArweaveTxId]: {
            balance: 100,
            end: SmartWeave.block.height + MIN_TOKEN_LOCK_BLOCK_LENGTH,
            start: SmartWeave.block.height,
          },
        },
      },
    };
    const error = await increaseVault(initialState, {
      caller: 'test',
      input: {
        id: stubbedArweaveTxId,
        qty: 100,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(INSUFFICIENT_FUNDS_MESSAGE);
  });

  it('should increase the vault in the state for the caller if the vault exists', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        test: 100,
      },
      vaults: {
        test: {
          [stubbedArweaveTxId]: {
            balance: 100,
            end: SmartWeave.block.height + MIN_TOKEN_LOCK_BLOCK_LENGTH,
            start: SmartWeave.block.height,
          },
        },
      },
    };
    const { state } = await increaseVault(initialState, {
      caller: 'test',
      input: {
        id: stubbedArweaveTxId,
        qty: 50,
      },
    });
    expect(state).toEqual({
      ...initialState,
      balances: {
        test: 50,
      },
      vaults: {
        test: {
          [stubbedArweaveTxId]: {
            balance: 150,
            end: SmartWeave.block.height + MIN_TOKEN_LOCK_BLOCK_LENGTH,
            start: SmartWeave.block.height,
          },
        },
      },
    });
  });
});
