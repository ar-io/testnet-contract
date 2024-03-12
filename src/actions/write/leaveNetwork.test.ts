import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  GATEWAY_LEAVE_BLOCK_LENGTH,
  GATEWAY_REGISTRY_SETTINGS,
  MIN_OPERATOR_STAKE,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedDelegateData,
  stubbedGatewayData,
} from '../../tests/stubs';
import { IOState } from '../../types';
import { leaveNetwork } from './leaveNetwork';

describe('leaveNetwork', () => {
  describe('invalid inputs', () => {
    it('should throw an error if the caller does not have a gateway', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
          },
        },
      };
      const error = await leaveNetwork(initialState, {
        caller: 'no-gateway',
        input: {},
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(
          'The caller does not have a registered gateway.',
        ),
      );
    });

    it('should throw an error if the gateway is already leaving', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            status: 'leaving',
          },
        },
      };
      const error = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        expect.stringContaining(
          'The gateway is not eligible to leave the network.',
        ),
      );
    });
  });

  describe('valid inputs', () => {
    beforeAll(() => {
      SmartWeave.block.height =
        GATEWAY_REGISTRY_SETTINGS.minGatewayJoinLength.valueOf();
    });

    afterAll(() => {
      SmartWeave.block.height = 1;
    });

    it('should leave the network with minimum stake', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            start: 0,
          },
        },
      };
      const { state } = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        operatorStake: 0,
        vaults: {
          [stubbedArweaveTxId]: {
            balance: stubbedGatewayData.operatorStake,
            end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH,
            start: SmartWeave.block.height,
          },
        },
        status: 'leaving',
        start: 0,
        end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });

    it('should leave the network with higher than minimum stake', async () => {
      const newOperatorStake = 100_000;
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            operatorStake: newOperatorStake,
            start: 0,
          },
        },
      };
      const { state } = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        operatorStake: 0,
        vaults: {
          [stubbedArweaveTxId]: {
            balance: MIN_OPERATOR_STAKE.valueOf(),
            end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH.valueOf(),
            start: SmartWeave.block.height,
          },
          [SmartWeave.transaction.id]: {
            balance: newOperatorStake - MIN_OPERATOR_STAKE.valueOf(),
            end:
              SmartWeave.block.height +
              GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength,
            start: SmartWeave.block.height,
          },
        },
        status: 'leaving',
        start: 0,
        end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });

    it('should leave the network with delegated stakers', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            totalDelegatedStake: stubbedDelegateData.delegatedStake,
            start: 0,
            vaults: {},
            delegates: {
              [stubbedArweaveTxId]: {
                ...stubbedDelegateData,
              },
            },
          },
        },
      };
      const { state } = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        operatorStake: 0,
        totalDelegatedStake: 0,
        vaults: {
          [stubbedArweaveTxId]: {
            balance: stubbedGatewayData.operatorStake,
            end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH.valueOf(),
            start: SmartWeave.block.height,
          },
        },
        delegates: {
          [stubbedArweaveTxId]: {
            delegatedStake: 0,
            start: 0,
            vaults: {
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
        status: 'leaving',
        start: 0,
        end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });

    it('should leave the network with delegated stakers and existing gateway and delegate vaults', async () => {
      const newOperatorStake = 100_000;
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...stubbedGatewayData,
            operatorStake: newOperatorStake,
            totalDelegatedStake: stubbedDelegateData.delegatedStake,
            start: 0,
            vaults: {
              ['gateway-vault-1']: {
                balance: 1000,
                start: 0,
                end: 5,
              },
            },
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
            },
          },
        },
      };
      const { state } = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...stubbedGatewayData,
        operatorStake: 0,
        totalDelegatedStake: 0,
        vaults: {
          ['gateway-vault-1']: {
            balance: 1000,
            start: 0,
            end: 5,
          },
          [stubbedArweaveTxId]: {
            balance: MIN_OPERATOR_STAKE.valueOf(),
            end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH.valueOf(),
            start: SmartWeave.block.height,
          },
          [SmartWeave.transaction.id]: {
            balance: newOperatorStake - MIN_OPERATOR_STAKE.valueOf(),
            end:
              SmartWeave.block.height +
              GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength,
            start: SmartWeave.block.height,
          },
        },
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
                end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
                start: SmartWeave.block.height,
              },
            },
          },
        },
        status: 'leaving',
        start: 0,
        end: SmartWeave.block.height + GATEWAY_LEAVE_BLOCK_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });
  });
});
