import {
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVER_WALLET,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedGatewayData,
} from '../../tests/stubs';
import { updateGatewaySettings } from './updateGatewaySettings';

describe('updateGatewaySettings', () => {
  describe('invalid inputs', () => {
    it.each([['bad-port', '0', 0, -1, true, Number.MAX_SAFE_INTEGER]])(
      'should throw an error on invalid qty',
      async (badQty: unknown) => {
        const initialState = getBaselineState();
        const error = await updateGatewaySettings(initialState, {
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
    it('should fail if observerWallet is used by another gateway', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          'a-gateway': stubbedGatewayData,
          'a-gateway-2': {
            ...stubbedGatewayData,
            observerWallet: stubbedArweaveTxId,
          },
        },
      };
      const error = await updateGatewaySettings(initialState, {
        caller: 'a-gateway',
        input: {
          observerWallet: stubbedArweaveTxId,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INVALID_OBSERVER_WALLET),
      );
    });

    it('should not fail if observerWallet is used by the caller gateway', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          'a-gateway': {
            ...stubbedGatewayData,
            observerWallet: stubbedArweaveTxId,
          },
          'a-gateway-2': {
            ...stubbedGatewayData,
            observerWallet: 'not-the-same-wallet',
          },
        },
      };
      const { state } = await updateGatewaySettings(initialState, {
        caller: 'a-gateway',
        input: {
          observerWallet: stubbedArweaveTxId,
        },
      });
      expect(state).toEqual(initialState);
    });
  });
});
