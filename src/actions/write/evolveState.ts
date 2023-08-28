import { NON_CONTRACT_OWNER_MESSAGE } from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // evolve records
  const { records } = state;
  const newRecords = Object.keys(records).reduce((acc, key) => {
    const { tier, undernames, ...everythingElse } = records[key] as any;
    acc[key] = {
      ...everythingElse,
      undernames: 10,
    };
    return acc;
  }, {});

  state.records = newRecords;

  // add gateway settings
  state.settings.registry = {
    minLockLength: 5,
    maxLockLength: 720 * 365 * 3,
    minNetworkJoinStakeAmount: 5_000,
    minGatewayJoinLength: 2,
    gatewayLeaveLength: 2,
    operatorStakeWithdrawLength: 5,
  };

  // remove tiers
  const { tiers, ...restOfState } = state as any;
  state = restOfState;

  return { state };
};
