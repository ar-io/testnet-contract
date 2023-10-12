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

// stored in ./wallets directory
export const TEST_WALLET_IDS = [
  'BwcaNGvP9OQFQYn7ModWNyTmm_UiBP2HMmj9jGzPnkc',
  'F20eFICcNqd5YtEC6NvjvcAKCgE2YRFtl6R1PhIuGJA',
  'FUo4elJRgyPPPlXWFOvbjDEwOpdd5H_9GVpcW5ECqAo',
  'G6r5GhJkHeBCFntfLmIXkrIPOPqldY4t99IEM4nHy8Y',
  'MD7yq8v-CadUNRu0WabSh0QIdMzcd4sN8j-pK64lTFA',
  'QgKhSVnwXSbwnjcB64FiESUCcoIo1Vac1lClPtVYsqk',
  'Sqp_5Kt22--PebyhwRVYq4_mqhNFDHMBrHpp23mxuaQ',
  'tPNpS_qoeNjTbhumXD_4WqGt4yRM4lgX8r_1mJnB73w',
  'W24cNE-ZXWYSac8_45x4ZMqxmut6WqV-jOxPGw0kChU',
  'xinm5fA92EnMT3zI-2I7QGs-B42vUa05z2nPtiFnD38',
];
