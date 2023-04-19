import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

// Unlocks the vault of a gateway operator
export const initiateOperatorStakeDecrease = async (
  state: IOState,
  { caller, input: { id } }: PstAction,
): Promise<ContractResult> => {
  const settings = state.settings;
  const gateways = state.gateways;

  if (!(caller in gateways)) {
    throw new ContractError("This Gateway's wallet is not registered");
  }

  if (
    typeof id !== 'number' ||
    (id >= gateways[caller].vaults.length && id < 0)
  ) {
    throw new ContractError('Invalid vault index provided');
  }

  if (
    gateways[caller].operatorStake - gateways[caller].vaults[id].balance <
    settings.minNetworkJoinStakeAmount
  ) {
    throw new ContractError(
      'Not enough operator stake to maintain the minimum',
    );
  }

  // Unstake a single gateway that is active
  if (gateways[caller].vaults[id].end === 0) {
    // Begin unstake process
    state.gateways[caller].vaults[id].end =
      +SmartWeave.block.height + settings.operatorStakeWithdrawLength;
  } else {
    throw new ContractError(
      `This vault is already being unlocked at ${gateways[caller].vaults[id].end}`,
    );
  }
  return { state };
};
