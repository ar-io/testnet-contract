import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVER_WALLET,
  MIN_DELEGATED_STAKE,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedDelegateData,
  stubbedGatewayData,
} from '../../tests/stubs';
import { IOState, IOToken } from '../../types';
import { updateGatewaySettings } from './updateGatewaySettings';

describe('updateGatewaySettings', () => {
  describe('invalid inputs', () => {
    it.each([[0, '', stubbedArweaveTxId.concat(stubbedArweaveTxId), true]])(
      'should throw an error on invalid label',
      async (badLabel: unknown) => {
        const initialState: IOState = {
          ...getBaselineState(),
          gateways: {
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
            },
          },
        };
        const error = await updateGatewaySettings(initialState, {
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

    it.each([[0, '', stubbedArweaveTxId, 'true']])(
      'should throw an error on invalid allowDelegatedStaking',
      async (badallowDelegatedStaking: unknown) => {
        const initialState: IOState = {
          ...getBaselineState(),
          gateways: {
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
            },
          },
        };
        const error = await updateGatewaySettings(initialState, {
          caller: stubbedArweaveTxId,
          input: {
            allowDelegatedStaking: badallowDelegatedStaking,
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
    it('should throw an error if the caller does not have a gateway', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
      };
      const error = await updateGatewaySettings(initialState, {
        caller: 'no-gateway',
        input: {},
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INVALID_GATEWAY_REGISTERED_MESSAGE),
      );
    });

    it('should throw an error if the observer wallet exists in the GAR already', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            observerWallet: stubbedArweaveTxId,
          },
          ['gateway']: {
            ...stubbedGatewayData,
            observerWallet: 'changethis',
          },
        },
      };
      const error = await updateGatewaySettings(initialState, {
        caller: 'gateway',
        input: {
          observerWallet: stubbedArweaveTxId, // this should match the observer wallet for the other existing gateway
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(INVALID_OBSERVER_WALLET),
      );
    });

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

    it('should change a single setting', async () => {
      const updatedFqdn = 'updated-fqdn.com';
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
      };
      const { state } = await updateGatewaySettings(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          fqdn: updatedFqdn,
        },
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          fqdn: updatedFqdn,
        },
      });
    });

    it('should change all settings', async () => {
      const observerWallet = 'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA';
      const updatedGatewaySettings = {
        label: 'Updated Label', // friendly label
        port: 80,
        protocol: 'http',
        fqdn: 'back-to-port-80.com',
        properties: 'WRONg6rQ9Py7L8j4CkS8jn818gdXW25Oofg0q2E58ro',
        note: 'a new note',
        allowDelegatedStaking: true,
        delegateRewardShareRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
        minDelegatedStake:
          MIN_DELEGATED_STAKE.toIO().valueOf() + new IOToken(1).valueOf(),
        autoStake: true,
      };
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
      };
      const { state } = await updateGatewaySettings(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          observerWallet,
          ...updatedGatewaySettings,
        },
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        observerWallet: observerWallet,
        settings: {
          ...updatedGatewaySettings,
          minDelegatedStake:
            // should be converted to mIO
            MIN_DELEGATED_STAKE.valueOf() + new IOToken(1).toMIO().valueOf(),
        },
      });
    });

    it('should disable allow delegated staking with delegated stakers', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
            },
            totalDelegatedStake: stubbedDelegateData.delegatedStake * 2, // there are two delegates staked
            delegates: {
              [stubbedArweaveTxId]: {
                ...stubbedDelegateData,
                vaults: {
                  ['delegate-vault-1']: {
                    balance: 1000,
                    start: 0,
                    end: 5,
                  },
                },
              },
              ['another one']: {
                ...stubbedDelegateData,
                vaults: {
                  ['delegate-vault-1']: {
                    balance: 1000,
                    start: 0,
                    end: 5,
                  },
                },
              },
            },
          },
        },
      };
      const { state } = await updateGatewaySettings(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          allowDelegatedStaking: false,
        },
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        settings: {
          ...stubbedGatewayData.settings,
          allowDelegatedStaking: false,
        },
        totalDelegatedStake: 0,
        delegates: {
          [stubbedArweaveTxId]: {
            delegatedStake: 0,
            start: 0,
            vaults: {
              ['delegate-vault-1']: {
                balance: 1000,
                start: 0,
                end: 5,
              },
              [SmartWeave.transaction.id]: {
                balance: stubbedDelegateData.delegatedStake,
                end:
                  SmartWeave.block.height +
                  DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
                start: SmartWeave.block.height,
              },
            },
          },
          ['another one']: {
            delegatedStake: 0,
            start: 0,
            vaults: {
              ['delegate-vault-1']: {
                balance: 1000,
                start: 0,
                end: 5,
              },
              [SmartWeave.transaction.id]: {
                balance: stubbedDelegateData.delegatedStake,
                end:
                  SmartWeave.block.height +
                  DELEGATED_STAKE_UNLOCK_LENGTH.valueOf(),
                start: SmartWeave.block.height,
              },
            },
          },
        },
      });
    });

    it('should not allow reenabling delegated staking with delegates leaving', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: false,
            },
            totalDelegatedStake: stubbedDelegateData.delegatedStake * 2, // there are two delegates staked
            delegates: {
              [stubbedArweaveTxId]: {
                delegatedStake: 0,
                start: 0,
                vaults: {
                  ['delegate-vault-1']: {
                    balance: 1000,
                    start: 0,
                    end: 5,
                  },
                },
              },
              ['another one']: {
                delegatedStake: 0,
                start: 0,
                vaults: {
                  ['delegate-vault-1']: {
                    balance: 1000,
                    start: 0,
                    end: 5,
                  },
                },
              },
            },
          },
        },
      };
      const error = await updateGatewaySettings(initialState, {
        caller: stubbedArweaveTxId,
        input: {
          allowDelegatedStaking: true,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(
          'You cannot enable delegated staking until all delegated stakes have been withdrawn.',
        ),
      );
    });
  });
});
