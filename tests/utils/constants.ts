import { IOState } from '../../src/contracts/types/types';
import initialContractState from './initial-state.json';

export const TRANSFER_AMOUNT = 5_000_000;
export const INTERACTION_COST = 20000;
export const DEFAULT_ANT_CONTRACT_ID =
  'MSFTfeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU';
export const SECONDS_IN_A_YEAR = 31_536_000;
export const DEFAULT_WALLET_FUND_AMOUNT = 1_000_000_000_000_000;
export const DEFAULT_INITIAL_STATE = initialContractState as unknown as IOState;
export const DEFAULT_TRANSFER_QTY = 100_000;
// Also export all our other constants
export * from '../../src/constants';
