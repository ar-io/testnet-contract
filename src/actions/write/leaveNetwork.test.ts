import {
  DELEGATED_STAKE_UNLOCK_LENGTH,
  GATEWAY_LEAVE_LENGTH,
  MINIMUM_GATEWAY_JOIN_LENGTH,
} from '../../constants';
import {
  baselineDelegateData,
  baselineGatewayData,
  getBaselineState,
  stubbedArweaveTxId,
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
            ...baselineGatewayData,
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
            ...baselineGatewayData,
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
    it('should leave the network', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
            start: MINIMUM_GATEWAY_JOIN_LENGTH * -1, // hack to get around minimum join time
          },
        },
      };
      const { state } = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...baselineGatewayData,
        operatorStake: 0,
        vaults: {
          [SmartWeave.transaction.id]: {
            balance: baselineGatewayData.operatorStake,
            end: SmartWeave.block.height + GATEWAY_LEAVE_LENGTH,
            start: SmartWeave.block.height,
          },
        },
        status: 'leaving',
        start: MINIMUM_GATEWAY_JOIN_LENGTH * -1, // hack to get around minimum join time
        end: SmartWeave.block.height + GATEWAY_LEAVE_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });

    it('should leave the network with delegated stakers', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
            delegatedStake: baselineDelegateData.delegatedStake,
            start: MINIMUM_GATEWAY_JOIN_LENGTH * -1, // hack to get around minimum join time
            delegates: {
              [stubbedArweaveTxId]: {
                ...baselineDelegateData,
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
        ...baselineGatewayData,
        operatorStake: 0,
        delegatedStake: 0,
        vaults: {
          [SmartWeave.transaction.id]: {
            balance: baselineGatewayData.operatorStake,
            end: SmartWeave.block.height + GATEWAY_LEAVE_LENGTH,
            start: SmartWeave.block.height,
          },
        },
        delegates: {
          [stubbedArweaveTxId]: {
            delegatedStake: 0,
            start: 0,
            end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
            vaults: {
              [SmartWeave.transaction.id]: {
                balance: baselineDelegateData.delegatedStake,
                end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
                start: SmartWeave.block.height,
              },
            },
          },
        },
        status: 'leaving',
        start: MINIMUM_GATEWAY_JOIN_LENGTH * -1, // hack to get around minimum join time
        end: SmartWeave.block.height + GATEWAY_LEAVE_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });

    it('should leave the network with delegated stakers and existing gateway and delegate vaults', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: {
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
            delegatedStake: baselineDelegateData.delegatedStake,
            start: MINIMUM_GATEWAY_JOIN_LENGTH * -1, // hack to get around minimum join time
            vaults: {
              ['gateway-vault-1']: {
                balance: 1000,
                start: 0,
                end: 5,
              },
            },
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
            },
          },
        },
      };
      const { state } = await leaveNetwork(initialState, {
        caller: stubbedArweaveTxId,
        input: {},
      });
      expect(state.gateways[stubbedArweaveTxId]).toEqual({
        ...baselineGatewayData,
        operatorStake: 0,
        delegatedStake: 0,
        vaults: {
          ['gateway-vault-1']: {
            balance: 1000,
            start: 0,
            end: 5,
          },
          [SmartWeave.transaction.id]: {
            balance: baselineGatewayData.operatorStake,
            end: SmartWeave.block.height + GATEWAY_LEAVE_LENGTH,
            start: SmartWeave.block.height,
          },
        },
        delegates: {
          [stubbedArweaveTxId]: {
            delegatedStake: 0,
            start: 0,
            end: SmartWeave.block.height + DELEGATED_STAKE_UNLOCK_LENGTH,
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
        status: 'leaving',
        start: MINIMUM_GATEWAY_JOIN_LENGTH * -1, // hack to get around minimum join time
        end: SmartWeave.block.height + GATEWAY_LEAVE_LENGTH,
      });
      expect(state.balances['existing-gateway']).toEqual(undefined);
    });
  });
});
