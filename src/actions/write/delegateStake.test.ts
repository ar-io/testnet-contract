import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MIN_DELEGATED_STAKE,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedGatewayData,
} from '../../tests/stubs';
import { delegateStake } from './delegateStake';

describe('delegateStake', () => {
  describe('invalid inputs', () => {
    it.each([['bad-qty', '0', 0, -1, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await delegateStake(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            target: stubbedArweaveTxId,
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
        'bad-address',
        '0',
        0,
        -1,
        Number.MAX_SAFE_INTEGER,
        stubbedArweaveTxId.slice(0, stubbedArweaveTxId.length - 1),
      ],
    ])(
      'should throw an error on invalid gateway address',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await delegateStake(initialState, {
          caller: 'test',
          input: {
            qty: badQty,
            target: stubbedArweaveTxId,
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
    it('should throw an error if the caller does not have sufficient balance', async () => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          test: 99,
        },
      };
      const error = await delegateStake(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should throw an error if the target gateway does not allow staking', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: stubbedGatewayData,
        },
        balances: {
          test: 10_000,
        },
      };
      const error = await delegateStake(initialState, {
        caller: 'test',
        input: {
          qty: 100,
          target: stubbedArweaveTxId,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(
          'This Gateway does not allow delegated staking.',
        ),
      );
    });

    it('should create a delegate stake in on the gateway if the caller has a sufficient balance and the gateway allows delegated staking', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
          },
        },
        balances: {
          test: MIN_DELEGATED_STAKE.valueOf() + 1000,
        },
      };
      const { state } = await delegateStake(initialState, {
        caller: 'test',
        input: {
          qty: MIN_DELEGATED_STAKE.valueOf(),
          target: stubbedArweaveTxId,
        },
      });
      expect(state).toEqual({
        ...initialState,
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
            totalDelegatedStake: MIN_DELEGATED_STAKE.valueOf(),
            delegates: {
              test: {
                delegatedStake: MIN_DELEGATED_STAKE.valueOf(),
                start: SmartWeave.block.height,
                vaults: {},
              },
            },
          },
        },
        balances: {
          test: 1000,
        },
      });
    });
  });
});
