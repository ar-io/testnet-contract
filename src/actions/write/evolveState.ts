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
  const airdrop = 3000;
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
