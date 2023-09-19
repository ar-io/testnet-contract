import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave;

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // An amount to airdrop to gateway testnet operators
  const airdrop = 1500;

  // Set each gateway to have an empty array of vaults
  for (const address in state.gateways) {
    state.gateways[address].vaults = [];
    state.balances[address] += airdrop; // Give each gateway operator an unlocked airdrop from owner wallet
    state.balances[owner] -= airdrop; // Reduce amount from the owner wallet
  }

  // Update Gateway Address Registry settings
  state.settings.registry = {
    minLockLength: 720, // 1 day of blocks
    maxLockLength: 720 * 365 * 3, // 3 years of blocks
    minNetworkJoinStakeAmount: 10000,
    minGatewayJoinLength: 720 * 5, // The gateway may begin leave the network for 5 days of blocks
    gatewayLeaveLength: 720 * 5, // The gateway must wait 5 days of blocks in order to fully leave the network
    operatorStakeWithdrawLength: 720 * 5, // The gateway must wait 5 days of blocks to unlock and withdraw any stake
  };

  // Update fees and 51 character names
  state.fees = {
    '1': 5_000_000,
    '2': 500_000,
    '3': 100_000,
    '4': 25_000,
    '5': 10_000,
    '6': 5_000,
    '7': 2_500,
    '8': 1_500,
    '9': 1_250,
    '10': 1_250,
    '11': 1_250,
    '12': 1_250,
    '13': 1_000, // this fee was missing previously
    '14': 1_000,
    '15': 1_000,
    '16': 1_000,
    '17': 1_000,
    '18': 1_000,
    '19': 1_000,
    '20': 1_000,
    '21': 1_000,
    '22': 1_000,
    '23': 1_000,
    '24': 1_000,
    '25': 1_000,
    '26': 1_000,
    '27': 1_000,
    '28': 1_000,
    '29': 1_000,
    '30': 1_000,
    '31': 1_000,
    '32': 1_000,
    '33': 1_000,
    '34': 1_000,
    '35': 1_000,
    '36': 1_000,
    '37': 1_000,
    '38': 1_000,
    '39': 1_000,
    '40': 1_000,
    '41': 1_000,
    '42': 1_000,
    '43': 1_000,
    '44': 1_000,
    '45': 1_000,
    '46': 1_000,
    '47': 1_000,
    '48': 1_000,
    '49': 1_000,
    '50': 1_000,
    '51': 1_000,
  };

  // Reclaim tokens from broken balance
  const badBalance = 'T7179iMclGFeIztwWy02XOM-5Ebx10TINteE8K8N5Dk '; // Incorrect trailing space
  if (Object.prototype.hasOwnProperty.call(state.balances, badBalance)) {
    // If badBalance exists, add its value to owner's balance
    state.balances[owner] += state.balances[badBalance];

    // Delete the badBalance entry
    delete state.balances[badBalance];
  }

  return { state };
};
