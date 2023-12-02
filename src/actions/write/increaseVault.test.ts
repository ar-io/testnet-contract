import { IOState } from 'src/types';

import { INVALID_INPUT_MESSAGE, MIN_TOKEN_LOCK_LENGTH } from '../../constants';
import { getBaselineState } from '../../tests/stubs';
import { increaseVault } from './increaseVault';

describe('increaseVault', () => {
  describe('invalid inputs', () => {
    it.each([['bad-qty', undefined, '0', 0, -1, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qtyh',
      async (badQty: unknown) => {
        const initialState: IOState = {
          ...getBaselineState(),
          vaults: {
            test: [
              {
                balance: 100,
                end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
                start: SmartWeave.block.height,
              },
            ],
          },
        };
        const error = await increaseVault(initialState, {
          caller: 'test',
          input: {
            index: 0,
            qty: badQty,
          },
        }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );

    it('should throw an error on invalid caller', async () => {
      const initialState = getBaselineState();
      const error = await increaseVault(initialState, {
        caller: 'no-vault',
        input: {
          index: 0,
          qty: 100,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining('Caller balance is not defined!'),
      );
    });

    it('should throw an error if the caller does not have a vault at the provided index', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          test: 100,
        },
        vaults: {
          test: [
            {
              balance: 100,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          ],
        },
      };
      const error = await increaseVault(initialState, {
        caller: 'test',
        input: {
          index: 1,
          qty: 50,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(expect.stringContaining('.'));
    });

    it('should throw an error if the caller does not have sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: 99,
        },
        vaults: {
          test: [
            {
              balance: 100,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          ],
        },
      };
      const error = await increaseVault(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          id: 0,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(
          'Invalid input for interaction for increaseVault',
        ),
      );
    });

    it('should increase the vault in the state for the caller if the vault exists', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          test: 100,
        },
        vaults: {
          test: [
            {
              balance: 100,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          ],
        },
      };
      const { state } = await increaseVault(initialState, {
        caller: 'test',
        input: {
          index: 0,
          qty: 50,
        },
      });
      expect(state).toEqual({
        ...initialState,
        balances: {
          test: 50,
        },
        vaults: {
          test: [
            {
              balance: 150,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          ],
        },
      });
    });
  });
});
