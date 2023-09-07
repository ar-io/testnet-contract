import initialContractState from './initial-state.json';

export enum REGISTRATION_TYPES {
  LEASE = 'lease',
  BUY = 'permabuy',
}
export const MINIMUM_ALLOWED_EVOLUTION_DELAY = 4; // 4 blocks for testing purposes, but should be 720 * 7; // 720 blocks per day times 7 days
export const FOUNDATION_ACTION_PERIOD = 1;
export const FOUNDATION_STARTING_BALANCE = 10_000;
export const TRANSFER_AMOUNT = 5_000_000;
export const INTERACTION_COST = 20000;
export const ANT_CONTRACT_IDS = [
  'MSFTfeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU',
  'xSFTfoBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU',
  'ySFTfrBVyaJ8s9n7GxIyJNNc62jEVCcD7lbL3fV8kzU',
];
export const SECONDS_IN_A_YEAR = 31_536_000;
export const WALLET_FUND_AMOUNT = 1_000_000_000_000_000;
export const INITIAL_STATE = initialContractState;
export const TRANSFER_QTY = 100_000;
export const CONTRACT_SETTINGS = {
  minLockLength: 5,
  maxLockLength: 720 * 365 * 3,
  minNetworkJoinStakeAmount: 5_000,
  minGatewayJoinLength: 2,
  gatewayLeaveLength: 2,
  operatorStakeWithdrawLength: 5,
};
// Also export all our other constants
export * from '../../src/constants';
