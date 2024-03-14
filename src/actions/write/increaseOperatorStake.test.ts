import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  INVALID_INPUT_MESSAGE,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedGatewayData,
} from '../../tests/stubs';
import { GatewayStatus, IOToken } from '../../types';
import { increaseOperatorStake } from './increaseOperatorStake';

describe('increaseOperatorStake', () => {
  describe('invalid inputs', () => {
    it.each([[0, '', stubbedArweaveTxId.concat(stubbedArweaveTxId), true]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = {
          ...getBaselineState(),
          gateways: {
            [stubbedArweaveTxId]: stubbedGatewayData,
          },
          balances: {
            [stubbedArweaveTxId]: new IOToken(10000).toMIO().valueOf(),
          },
        };
        const error = await increaseOperatorStake(initialState, {
          caller: stubbedArweaveTxId,
          input: {
            qty: badQty,
          },
        }).catch((e: any) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(INVALID_INPUT_MESSAGE),
        );
      },
    );
  });

  describe('valid inputs', () => {
    it('should throw an error if the caller does not sufficient funds', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: stubbedGatewayData,
        },
        balances: {
          [stubbedArweaveTxId]: 100,
        },
      };
      const error = await increaseOperatorStake(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: 101,
        },
      }).catch((e: any) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INSUFFICIENT_FUNDS_MESSAGE),
      );
    });

    it('should throw an error if the caller is not an existing gateway', async () => {
      const initialState = getBaselineState();
      const error = await increaseOperatorStake(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: 100,
        },
      }).catch((e: any) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INVALID_GATEWAY_EXISTS_MESSAGE),
      );
    });

    it('should throw an error if the gateway is leaving the network', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            status: 'leaving' as GatewayStatus,
          },
        },
      };
      const error = await increaseOperatorStake(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: 100,
        },
      }).catch((e: any) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(
          'Gateway is leaving the network and cannot accept additional stake.',
        ),
      );
    });

    it('should increase the operator stake if the caller has enough balance and is an active gateway', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            operatorStake: new IOToken(100).toMIO().valueOf(),
          },
        },
        balances: {
          [stubbedArweaveTxId]: new IOToken(1000).toMIO().valueOf(),
        },
      };
      const { state } = await increaseOperatorStake(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          qty: new IOToken(1000).valueOf(),
        },
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        operatorStake: new IOToken(1100).toMIO().valueOf(),
      });
    });
  });
});
