import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  INVALID_INPUT_MESSAGE,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedGatewayData,
} from '../../tests/stubs';
import { IOState } from '../../types';
import { decreaseDelegateStake } from './decreaseDelegateStake';

describe('decreaseDelegateStake', () => {
  describe('invalid inputs', () => {
    it.each([[0, '', stubbedArweaveTxId.concat(stubbedArweaveTxId), true]])(
      'should throw an error on invalid target',
      async (badLabel: unknown) => {
        const initialState: IOState = {
          ...getBaselineState(),
          gateways: {
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
            },
          },
        };
        const error = await decreaseDelegateStake(initialState, {
          caller: stubbedArweaveTxId,
          input: {
            label: badLabel,
          },
        }).catch((e: any) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );

    it.each([['bad-port', '0', 0, -1, true, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await decreaseDelegateStake(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            settings: {
              port: badQty,
            },
          },
        }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );
  });

  describe('valid inputs', () => {
    it('should decrease the delegate stake', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            delegates: {
              ['existing-delegate']: {
                delegatedStake: 1000,
                start: 0,
                vaults: {},
              },
            },
          },
        },
      };
      const { state } = await decreaseDelegateStake(initialState, {
        caller: 'existing-delegate',
        input: {
          target: stubbedArweaveTxId,
          qty: 500,
        },
      });
      const expectedDecreasedDelegateData = {
        delegatedStake: 500,
        start: 0,
        vaults: {
          [SmartWeave.transaction.id]: {
            balance: 500,
            start: SmartWeave.block.height,
            end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
          },
        },
      };
      expect(
        state.gateways[stubbedArweaveTxId].delegates['existing-delegate'],
      ).toEqual(expectedDecreasedDelegateData);
    });
  });

  it('should error if the decrease would lower the delegate stake than the required minimum stake', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      gateways: {
        [stubbedArweaveTxId]: {
          ...stubbedGatewayData,
          delegates: {
            ['existing-delegate']: {
              delegatedStake: 1000,
              start: 0,
              vaults: {},
            },
          },
        },
      },
    };
    const error = await decreaseDelegateStake(initialState, {
      caller: 'existing-delegate',
      input: {
        target: stubbedArweaveTxId,
        qty: 901,
      },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      expect.stringContaining(
        'Remaining delegated stake must be greater than the minimum delegated stake amount.',
      ),
    );
  });

  it('should move the delegate stake to a vault if the decrease amount equals the current amount delegated', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      gateways: {
        [stubbedArweaveTxId]: {
          ...stubbedGatewayData,
          delegates: {
            ['existing-delegate']: {
              delegatedStake: 1000,
              start: 0,
              vaults: {},
            },
          },
        },
      },
    };
    const { state } = await decreaseDelegateStake(initialState, {
      caller: 'existing-delegate',
      input: {
        target: stubbedArweaveTxId,
        qty: 1000,
      },
    });
    const expectedDecreasedDelegateData = {
      delegatedStake: 0,
      start: 0,
      vaults: {
        [SmartWeave.transaction.id]: {
          balance: 1000,
          start: SmartWeave.block.height,
          end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
        },
      },
    };
    expect(
      state.gateways[stubbedArweaveTxId].delegates['existing-delegate'],
    ).toEqual(expectedDecreasedDelegateData);
  });
});
