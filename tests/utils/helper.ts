import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';

import { BlockHeight, Gateways, IOState } from '../../src/types';
import {
  ANT_CONTRACT_IDS,
  DEFAULT_UNDERNAME_COUNT,
  INITIAL_STATE,
  MAX_YEARS,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
  REGISTRATION_TYPES,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
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

function createRecords(count = MAX_YEARS) {
  const records: any = {};
  for (let i = 0; i < count; i++) {
    const name = `name${i + 1}`;
    const obj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp: Math.round(new Date('01/01/2025').getTime() / 1000),
      startTimestamp: Math.round(Date.now() / 1000 - SECONDS_IN_A_YEAR),
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: REGISTRATION_TYPES.LEASE,
    };
    records[name] = obj;
    // names in grace periods
    const gracePeriodName = `grace-period-name${i + 1}`;
    const gracePeriodObj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp: Math.round(Date.now() / 1000),
      startTimestamp: Math.round(Date.now() / 1000 - SECONDS_IN_A_YEAR),
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: REGISTRATION_TYPES.LEASE,
    };
    records[gracePeriodName] = gracePeriodObj;
    // expired names
    const expiredName = `expired-name${i + 1}`;
    const expiredObj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp: Math.round(Date.now() / 1000),
      startTimestamp: Math.round(
        Date.now() / 1000 - (SECONDS_IN_A_YEAR + SECONDS_IN_GRACE_PERIOD + 1),
      ),
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: REGISTRATION_TYPES.LEASE,
    };
    records[expiredName] = expiredObj;
    // a name for each lease length
    const leaseLengthName = `lease-length-name${
      i > 0 ? i : REGISTRATION_TYPES.BUY
    }`;
    const leaseLengthObj = {
      contractTxID: ANT_CONTRACT_IDS[0],
      endTimestamp:
        i > 0
          ? Math.round(Date.now() / 1000 + SECONDS_IN_A_YEAR * i - 1)
          : undefined,
      startTimestamp: Math.round(Date.now() / 1000 - 1),
      undernames: DEFAULT_UNDERNAME_COUNT,
      type: i > 0 ? REGISTRATION_TYPES.LEASE : REGISTRATION_TYPES.BUY,
    };
    records[leaseLengthName] = leaseLengthObj;
  }
  return records;
}

function createGateways(wallets: string[]) {
  const gateways: Gateways = {
    [wallets[0]]: {
      operatorStake: 50_000,
      start: -1,
      end: 0,
      status: NETWORK_JOIN_STATUS,
      vaults: {},
      settings: {
        label: 'Arweave Community Gateway', // The friendly name used to label this gateway
        fqdn: 'arweave.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'The friendliest gateway to the whole permaweb',
      },
      observerWallet: wallets[0],
    },
    [wallets[1]]: {
      operatorStake: 10_000,
      status: NETWORK_JOIN_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'Slashme', // The friendly name used to label this gateway
        fqdn: 'slash-this-gateway.io', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'i do bad things',
      },
      observerWallet: wallets[1],
    },
    [wallets[2]]: {
      operatorStake: 250_000,
      status: NETWORK_JOIN_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'Delegateme', // The friendly name used to label this gateway
        fqdn: 'delegate.org', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 80, // The port used by this gateway eg. 443
        protocol: 'http', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: '',
      },
      observerWallet: wallets[2],
    },
    [wallets[3]]: {
      operatorStake: 15_000,
      status: NETWORK_JOIN_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'Wack-gateway', // The friendly name used to label this gateway
        fqdn: 'brokeninfra.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 12345, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: '',
      },
      observerWallet: wallets[3],
    },
    [wallets[4]]: {
      operatorStake: 100_000,
      status: NETWORK_JOIN_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'Observation', // The friendly name used to label this gateway
        fqdn: 'observation.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Observation testing',
      },
      observerWallet: wallets[4],
    },
    [wallets[5]]: {
      operatorStake: 20_000,
      status: NETWORK_JOIN_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'Another Observer', // The friendly name used to label this gateway
        fqdn: 'observation-again.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'More observervation testing',
      },
      observerWallet: wallets[5],
    },
    [wallets[6]]: {
      operatorStake: 20_000,
      status: NETWORK_JOIN_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'Leaving', // The friendly name used to label this gateway
        fqdn: 'leaving.io', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving after epoch 0',
      },
      observerWallet: wallets[6],
    },
    [wallets[7]]: {
      operatorStake: 10_000,
      status: NETWORK_LEAVING_STATUS,
      start: -1,
      end: 0,
      vaults: {},
      settings: {
        label: 'See Ya Later', // The friendly name used to label this gateway
        fqdn: 'goodbye.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving the network',
      },
      observerWallet: wallets[7],
    },
    [wallets[8]]: {
      operatorStake: 10_000,
      status: NETWORK_JOIN_STATUS,
      start: 10_000,
      end: 0,
      vaults: {},
      settings: {
        label: 'See Ya Later', // The friendly name used to label this gateway
        fqdn: 'goodbye.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving the network',
      },
      observerWallet: wallets[8],
    },
    [wallets[9]]: {
      operatorStake: 10_000,
      status: NETWORK_LEAVING_STATUS,
      start: -1,
      end: 100,
      vaults: {},
      settings: {
        label: 'See Ya Later', // The friendly name used to label this gateway
        fqdn: 'goodbye.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
        port: 443, // The port used by this gateway eg. 443
        protocol: 'https', // The protocol used by this gateway, either http or https
        properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44', // An arweave transaction ID referencing the properties of this gateway
        note: 'Leaving the network',
      },
      observerWallet: wallets[9],
    },
  };

  return gateways;
}

export async function setupInitialContractState(
  owner: string,
  wallets: string[],
): Promise<IOState> {
  const state: IOState = INITIAL_STATE as unknown as IOState;

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
  state.demandFactoring.periodZeroBlockHeight = (
    await getCurrentBlock(arweave)
  ).valueOf();

  // setup auctions
  state.auctions = {};

  // create some records
  state.records = createRecords();

  // set the owner to the first wallet
  state.owner = owner;

  // configure some basic gateways
  state.gateways = createGateways(wallets);

  // distributions
  state.distributions = {
    ...state.distributions,
    epochZeroStartHeight: (await getCurrentBlock(arweave)).valueOf(),
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
export * from '../../tools/utilities';
