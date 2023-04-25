import initialContractState from './initial-state.json';

export const DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS = 'active';
export const DEFAULT_FOUNDATION_ACTION_PASSED_STATUS = 'passed';
export const DEFAULT_FOUNDATION_ACTION_PERIOD = 1;
export const DEFAULT_FOUNDATION_STARTING_BALANCE = 10_000;
export const TRANSFER_AMOUNT = 5_000_000;
export const INTERACTION_COST = 20000;
export const DEFAULT_ANT_CONTRACT_ID =
  'MSFTfeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU';
export const SECONDS_IN_A_YEAR = 31_536_000;
export const DEFAULT_WALLET_FUND_AMOUNT = 1_000_000_000_000_000;
export const DEFAULT_INITIAL_STATE = initialContractState;
export const DEFAULT_TRANSFER_QTY = 100_000;
export const DEFAULT_CONTRACT_SETTINGS = {
  minLockLength: 5,
  minNetworkJoinStakeAmount: 5_000,
  minDelegatedStakeAmount: 100,
  minGatewayJoinLength: 2,
  gatewayLeaveLength: 2,
  delegatedStakeWithdrawLength: 5,
  operatorStakeWithdrawLength: 5,
};
// Also export all our other constants
export * from '../../src/constants';
