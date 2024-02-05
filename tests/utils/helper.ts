import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';

import { BlockHeight, Gateways, IOState } from '../../src/types';
import {
  ANT_CONTRACT_IDS,
  ARNS_LEASE_LENGTH_MAX_YEARS,
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  DEFAULT_UNDERNAME_COUNT,
  GENESIS_FEES,
  INITIAL_STATE,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
  REGISTRATION_TYPES,
  SECONDS_IN_A_YEAR,
  WALLET_FUND_AMOUNT,
} from './constants';
import { arweave } from './services';

// ~~ Write function responsible for adding funds to the generated wallet ~~
export async function addFunds(
  arweave: Arweave,
  address: string,
  amount: number = WALLET_FUND_AMOUNT,
): Promise<boolean> {
  await arweave.api.get(`/mint/${address}/${amount}`);
  return true;
}

// ~~ Write function responsible for mining block on the Arweave testnet ~~
export async function mineBlock(arweave: Arweave): Promise<boolean> {
  await arweave.api.get('mine');
  return true;
}

export async function getCurrentBlock(arweave: Arweave): Promise<BlockHeight> {
  return new BlockHeight((await arweave.blocks.getCurrent()).height);
}

export async function getCurrentBlockTimestamp(
  arweave: Arweave,
): Promise<number> {
  return (await arweave.blocks.getCurrent()).timestamp;
}

export async function mineBlocks(
  arweave: Arweave,
  blocks: number,
): Promise<void> {
  for (let i = 0; i < blocks; i++) {
    await mineBlock(arweave);
  }
}

export async function createLocalWallet(
  arweave: Arweave,
): Promise<{ wallet: JWKInterface; address: string }> {
  // ~~ Generate wallet and add funds ~~
  const wallet = await arweave.wallets.generate();
  const address = await arweave.wallets.jwkToAddress(wallet);
  await addFunds(arweave, address);

  return {
    wallet,
    address,
  };
}

async function createRecords(count = ARNS_LEASE_LENGTH_MAX_YEARS) {
  const records: any = {};
  const currentBlockTimestamp = await getCurrentBlockTimestamp(arweave);
  for (let i = 0; i < count; i++) {
    const name = `name-${i + 1}`;
    const obj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp: currentBlockTimestamp + SECONDS_IN_A_YEAR * 5,
      startTimestamp: currentBlockTimestamp,
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: REGISTRATION_TYPES.LEASE,
    };
    records[name] = obj;
    // names in grace periods
    const gracePeriodName = `grace-period-name-${i + 1}`;
    const gracePeriodObj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp: currentBlockTimestamp, // it's expired but enough time to extend
      startTimestamp: currentBlockTimestamp,
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: REGISTRATION_TYPES.LEASE,
    };
    records[gracePeriodName] = gracePeriodObj;
    // expired names
    const expiredName = `expired-name-${i + 1}`;
    const expiredObj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp: 0,
      startTimestamp: currentBlockTimestamp,
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: REGISTRATION_TYPES.LEASE,
    };
    records[expiredName] = expiredObj;
    // a name for each lease length
    const recordName = i == 0 ? 'permabuy' : `lease-length-name-${i}`;

    const recordObj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp:
        i > 0 ? currentBlockTimestamp + SECONDS_IN_A_YEAR * i : undefined,
      startTimestamp: currentBlockTimestamp,
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: i > 0 ? REGISTRATION_TYPES.LEASE : REGISTRATION_TYPES.BUY,
    };
    records[recordName] = recordObj;
  }
  return records;
}

function createGateways(wallets: string[]) {
  const gateways: Gateways = {
    [wallets[0]]: {
      operatorStake: 50_000,
      delegatedStake: 0,
      start: 0,
      end: 0,
      status: NETWORK_JOIN_STATUS,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Arweave Community Gateway', // The friendly name used to label this gateway
        fqdn: 'arweave.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'The friendliest gateway to the whole permaweb',
      },
      observerWallet: wallets[0],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[1]]: {
      operatorStake: 10_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Slashme', // The friendly name used to label this gateway
        fqdn: 'slash-this-gateway.io', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'i do bad things',
      },
      observerWallet: wallets[1],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[2]]: {
      operatorStake: 250_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Delegateme', // The friendly name used to label this gateway
        fqdn: 'delegate.org', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 80, // The port used by this gateway eg. 443
        protocol: 'http', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: '',
      },
      observerWallet: wallets[2],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[3]]: {
      operatorStake: 15_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Wack-gateway', // The friendly name used to label this gateway
        fqdn: 'brokeninfra.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 12345, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: '',
      },
      observerWallet: wallets[3],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[4]]: {
      operatorStake: 100_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Observation', // The friendly name used to label this gateway
        fqdn: 'observation.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Observation testing',
      },
      observerWallet: wallets[4],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[5]]: {
      operatorStake: 20_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Another Observer', // The friendly name used to label this gateway
        fqdn: 'observation-again.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'More observervation testing',
      },
      observerWallet: wallets[5],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[6]]: {
      operatorStake: 20_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'Leaving', // The friendly name used to label this gateway
        fqdn: 'leaving.io', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving after epoch 0',
      },
      observerWallet: wallets[6],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[7]]: {
      operatorStake: 10_000,
      delegatedStake: 0,
      status: NETWORK_LEAVING_STATUS,
      start: 0,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'See Ya Later', // The friendly name used to label this gateway
        fqdn: 'goodbye.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving the network',
      },
      observerWallet: wallets[7],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[8]]: {
      operatorStake: 10_000,
      delegatedStake: 0,
      status: NETWORK_JOIN_STATUS,
      start: 10_000,
      end: 0,
      vaults: {},
      delegates: {},
      settings: {
        label: 'See Ya Later', // The friendly name used to label this gateway
        fqdn: 'goodbye.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving the network',
      },
      observerWallet: wallets[8],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
    [wallets[9]]: {
      operatorStake: 10_000,
      delegatedStake: 0,
      status: NETWORK_LEAVING_STATUS,
      start: 0,
      end: 100,
      vaults: {},
      delegates: {},
      settings: {
        label: 'See Ya Later', // The friendly name used to label this gateway
        fqdn: 'goodbye.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving the network',
      },
      observerWallet: wallets[9],
      stats: {
        ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
      },
    },
  };

  return gateways;
}

export async function setupInitialContractState(
  owner: string,
  wallets: string[],
): Promise<IOState> {
  const state: IOState = INITIAL_STATE as unknown as IOState;

  const currentBlockHeight = await getCurrentBlock(arweave);

  // set the fees
  state.fees = GENESIS_FEES;

  // create wallets and set balances
  state.balances = wallets.reduce((current: any, wallet) => {
    current[wallet] = WALLET_FUND_AMOUNT;
    return current;
  }, {});

  // add balance to the owner
  state.balances = {
    ...state.balances,
    [owner]: WALLET_FUND_AMOUNT, // TODO: transfer this to the protocol balance
  };

  // setup demand factor based from the current block height
  state.demandFactoring.periodZeroBlockHeight = currentBlockHeight.valueOf();

  // setup auctions
  state.auctions = {};

  // create some records
  state.records = await createRecords();

  // set the owner to the first wallet
  state.owner = owner;

  // configure some basic gateways
  state.gateways = createGateways(wallets);

  // distributions
  state.distributions = {
    ...state.distributions,
    epochZeroStartHeight: currentBlockHeight.valueOf(),
  };

  // prescribed observers
  state.prescribedObservers = {
    [state.distributions.epochStartHeight]: Object.keys(state.gateways).map(
      (gatewayAddress) => ({
        gatewayAddress,
        stake: 10000,
        start: currentBlockHeight.valueOf(),
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        tenureWeight: 1,
        stakeWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
        observerAddress: state.gateways[gatewayAddress].observerWallet,
      }),
    ),
  };

  // add some reserved names
  const currentDate = new Date(); // Get current date
  const sixMonthsLater = new Date(); // Create a new date object
  const sixMonthsPrevious = new Date(); // Create a new date object
  sixMonthsLater.setMonth(currentDate.getMonth() + 6);
  sixMonthsPrevious.setMonth(currentDate.getMonth() - 6);
  state.reserved = {
    ['www']: {}, // bricked named
    ['google']: {
      endTimestamp: Math.floor(sixMonthsLater.getTime() / 1000),
    }, // no owner, expires in 6 months and premium
    ['twitter']: {
      target: wallets[1],
      endTimestamp: Math.floor(sixMonthsLater.getTime() / 1000),
    },
    ['auction']: {
      target: wallets[1],
    },
    // no owner, expires in 6 months but not premium
    ['ario']: {
      endTimestamp: Math.floor(sixMonthsLater.getTime() / 1000),
    },
  };
  return state;
}

export function getLocalWallet(index = 0): JWKInterface {
  const wallet = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../wallets/${index}.json`), 'utf8'),
  ) as unknown as JWKInterface;
  return wallet;
}

export function getLocalArNSContractKey(key: 'srcTxId' | 'id' = 'id'): string {
  const contract = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `../contract/arns_contract.json`),
      'utf8',
    ),
  ) as unknown as IOState & { id: string; srcTxId: string };
  return contract[key];
}

export * from '../../src/utilities';
export * from '../../src/pricing';
export * from '../../src/auctions';
export * from '../../src/records';
export * from '../../tools/utilities';
