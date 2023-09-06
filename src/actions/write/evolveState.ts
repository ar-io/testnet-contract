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

  // Modify contract name and ticker
  state.name = 'Test IO';
  state.ticker = 'tIO';

  // Modify all balances
  const perUserBalance = 5_000;
  let totalSupply = 1_000_000_000;
  const balances = state.balances;
  Object.keys(balances).forEach((address) => {
    state.balances[address] = perUserBalance;
    totalSupply -= perUserBalance;
  });
  state.balances[owner] = totalSupply; //give the remaining amount to contract owner.

  // Update Gateway Address Registry settings
  const registry = {
    minLockLength: 720, // 1 day of blocks
    maxLockLength: 720 * 365 * 3, // 3 years of blocks
    minNetworkJoinStakeAmount: 10000,
    minGatewayJoinLength: 720 * 30, // 30 days of blocks
    gatewayLeaveLength: 720 * 30, // 30 days of blocks
    operatorStakeWithdrawLength: 720 * 30, // 30 days of blocks
  };
  state.settings.registry = registry;

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

  // evolve auctions
  const { records, auctions } = state;
  const newAuctions = Object.keys(auctions).reduce((acc, key) => {
    const { tier, ...everythingElse } = auctions[key] as any;
    // only keep it if the name isn't in records
    if (!records[key]) {
      acc[key] = everythingElse;
    }
    return acc;
  }, {});
  state.auctions = newAuctions;

  // add auctions settings
  const auctionsSettings = {
    current: 'f3ebbf46-a5f4-4f89-86ed-aaae4346db2a',
    history: [
      {
        id: 'f3ebbf46-a5f4-4f89-86ed-aaae4346db2a',
        floorPriceMultiplier: 1,
        startPriceMultiplier: 50,
        auctionDuration: 5040,
        decayRate: 0.0225,
        decayInterval: 30,
      },
    ],
  };
  state.settings.auctions = auctionsSettings;

  // evolve records
  const newRecords = Object.keys(records).reduce((acc, key) => {
    const { tier, undernames, ...everythingElse } = records[key] as any;
    acc[key] = {
      ...everythingElse,
      undernames: 10,
    };
    return acc;
  }, {});

  state.records = newRecords;

  // add gateways object
  state.gateways = {};

  // remove tiers
  const { tiers, ...restOfState } = state as any;
  state = restOfState;

  return { state };
};
