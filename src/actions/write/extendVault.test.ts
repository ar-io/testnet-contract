import { INVALID_INPUT_MESSAGE, MIN_TOKEN_LOCK_LENGTH } from '../../constants';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { IOState } from '../../types';
import { extendVault } from './extendVault';

describe('extendVault', () => {
  describe('invalid inputs', () => {
    it.each([
      ['bad-lock-length', undefined, '0', 0, -1, Number.MAX_SAFE_INTEGER],
    ])(
      'should throw an error on invalid lockLength',
      async (badLockLength: unknown) => {
        const initialState: IOState = {
          ...getBaselineState(),
          vaults: {
            test: {
              [stubbedArweaveTxId]: {
                balance: 100,
                end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
                start: SmartWeave.block.height,
              },
            },
          },
        };
        const error = await extendVault(initialState, {
          caller: 'test',
          input: {
            id: stubbedArweaveTxId,
            extendLength: badLockLength,
          },
        }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );

    it('should throw an error on invalid vault id', async () => {
      const initialState = getBaselineState();
      const error = await extendVault(initialState, {
        caller: 'no-vault',
        input: {
          id: stubbedArweaveTxId,
          extendLength: MIN_TOKEN_LOCK_LENGTH,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining('Invalid vault ID.'),
      );
    });

    it('should throw an error if the caller does not have a vault with the provided id', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          test: 99,
        },
        vaults: {
          test: {
            [stubbedArweaveTxId]: {
              balance: 100,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          },
        },
      };
      const error = await extendVault(initialState, {
        caller: 'test',
        input: {
          id: stubbedArweaveTxId.replace('a', 'b'),
          extendLength: MIN_TOKEN_LOCK_LENGTH,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining('Invalid vault ID.'),
      );
    });

    it('should extend the vault in the state for the caller if the vault exists', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        vaults: {
          test: {
            [stubbedArweaveTxId]: {
              balance: 100,
              end: SmartWeave.block.height + MIN_TOKEN_LOCK_LENGTH,
              start: SmartWeave.block.height,
            },
          },
        },
      };
      // TODO: should we allow extending a vault by 1 block if it already exists?
      const extensionLength = MIN_TOKEN_LOCK_LENGTH;
      const { state } = await extendVault(initialState, {
        caller: 'test',
        input: {
          id: stubbedArweaveTxId,
          extendLength: extensionLength,
        },
      });
      expect(state).toEqual({
        ...initialState,
        vaults: {
          test: {
            [stubbedArweaveTxId]: {
              balance: 100,
              end:
                SmartWeave.block.height +
                MIN_TOKEN_LOCK_LENGTH +
                extensionLength,
              start: SmartWeave.block.height,
            },
          },
        },
      });
    });
  });
});
