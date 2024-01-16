import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  INVALID_GATEWAY_REGISTERED_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVER_WALLET,
  MIN_DELEGATED_STAKE,
} from '../../constants';
import {
  baselineDelegateData,
  baselineGatewayData,
  getBaselineState,
  stubbedArweaveTxId,
} from '../../tests/stubs';
import { IOState } from '../../types';
import { updateGatewaySettings } from './updateGatewaySettings';

describe('updateGatewaySettings', () => {
  describe('invalid inputs', () => {
    it('should throw an error if the caller does not have a gateway', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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
            ...baselineGatewayData,
            observerWallet: stubbedArweaveTxId,
          },
          ['gateway']: {
            ...baselineGatewayData,
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

    it.each([[0, '', stubbedArweaveTxId.concat(stubbedArweaveTxId), true]])(
      'should throw an error on invalid label',
      async (badLabel: unknown) => {
        const initialState: IOState = {
          ...getBaselineState(),
          gateways: {
            [stubbedArweaveTxId]: {
              ...baselineGatewayData,
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
              ...baselineGatewayData,
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
  });

  describe('valid inputs', () => {
    it('should change a single setting', async () => {
      const updatedFqdn = 'updated-fqdn.com';
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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
        ...baselineGatewayData,
        settings: {
          ...baselineGatewayData.settings,
          fqdn: updatedFqdn,
        },
      });
    });

    it('should change all settings', async () => {
      const observerWallet = 'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA';
      const reservedDelegates: string[] = [];
      const updatedGatewaySettings = {
        label: 'Updated Label', // friendly label
        port: 80,
        protocol: 'http',
        fqdn: 'back-to-port-80.com',
        properties: 'WRONg6rQ9Py7L8j4CkS8jn818gdXW25Oofg0q2E58ro',
        note: 'a new note',
        allowDelegatedStaking: true,
        delegateRewardRatio: Math.floor(
          (1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD) * 100,
        ),
        reservedDelegates,
        minDelegatedStake: MIN_DELEGATED_STAKE + 1,
      };
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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
        ...baselineGatewayData,
        observerWallet: observerWallet,
        settings: {
          ...updatedGatewaySettings,
        },
      });
    });

    it('should disable allow delegated staking with delegated stakers', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
            settings: {
              ...baselineGatewayData.settings,
              allowDelegatedStaking: true,
            },
            delegatedStake: baselineDelegateData.delegatedStake * 2, // there are two delegates staked
            delegates: {
              [stubbedArweaveTxId]: {
                ...baselineDelegateData,
                vaults: {
                  ['delegate-vault-1']: {
                    balance: 1000,
                    start: 0,
                    end: 5,
                  },
                },
              },
              ['another one']: {
                ...baselineDelegateData,
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
        ...baselineGatewayData,
        settings: {
          ...baselineGatewayData.settings,
          allowDelegatedStaking: false,
        },
        delegatedStake: 0,
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
                balance: baselineDelegateData.delegatedStake,
                end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
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
                balance: baselineDelegateData.delegatedStake,
                end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
                start: SmartWeave.block.height,
              },
            },
          },
        },
      });
    });
  });
});
