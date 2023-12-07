import { GatewayRegistrySettings } from '../../src/types';
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
export const WALLETS_TO_CREATE = 17; // The first 15 are joined to the network.
export const SECONDS_IN_A_YEAR = 31_536_000;
export const WALLET_FUND_AMOUNT = 1_000_000_000_000_000;
export const INITIAL_STATE = initialContractState;
export const TRANSFER_QTY = 100_000;
export const CONTRACT_SETTINGS: GatewayRegistrySettings = {
  minLockLength: 5,
  maxLockLength: 720 * 365 * 3,
  minNetworkJoinStakeAmount: 10_000,
  minGatewayJoinLength: 2,
  gatewayLeaveLength: 2,
  operatorStakeWithdrawLength: 5,
};
export const EXAMPLE_OBSERVER_REPORT_TX_IDS = [
  'U35xQUnop2Oq1NwhpzRfTeXVSjC0M8H50MVlmo_cTJc',
  'TtXk8kqgGYVqTQeHaJzst3toA2qz9UO0AGX1lUeuxvc',
];

export const EXAMPLE_LIST_OF_FAILED_GATEWAYS = [
  EXAMPLE_OBSERVER_REPORT_TX_IDS.concat(['fakeone']),
];
// Also export all our other constants
export * from '../../src/constants';
