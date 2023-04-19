import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';

import { IOState, ServiceTier } from '../../src/types';
import {
  DEFAULT_ANT_CONTRACT_ID,
  DEFAULT_INITIAL_STATE,
  DEFAULT_WALLET_FUND_AMOUNT,
} from './constants';

// ~~ Write function responsible for adding funds to the generated wallet ~~
export async function addFunds(
  arweave: Arweave,
  wallet: JWKInterface,
  amount: number = DEFAULT_WALLET_FUND_AMOUNT,
): Promise<boolean> {
  const walletAddress = await arweave.wallets.getAddress(wallet);
  await arweave.api.get(`/mint/${walletAddress}/${amount}`);
  return true;
}

// ~~ Write function responsible for mining block on the Arweave testnet ~~
export async function mineBlock(arweave: Arweave): Promise<boolean> {
  await arweave.api.get('mine');
  return true;
}

export async function createLocalWallet(
  arweave: Arweave,
): Promise<{ wallet: JWKInterface; address: string }> {
  // ~~ Generate wallet and add funds ~~
  const wallet = await arweave.wallets.generate();
  const address = await arweave.wallets.jwkToAddress(wallet);
  await addFunds(arweave, wallet);
  return {
    wallet,
    address,
  };
}

export function createTiers(count = 3): ServiceTier[] {
  const tiers: ServiceTier[] = [];
  for (let i = 1; i <= count; i++) {
    const newTier = {
      id: uuidV4(),
      fee: i * 100,
      settings: {
        maxUndernames: i * 100,
      },
    };
    tiers.push(newTier);
  }
  return tiers;
}

function createFees(count = 32, start = DEFAULT_WALLET_FUND_AMOUNT) {
  const fees = {};
  for (let i = 1; i <= count; i++) {
    // TODO: write a better algo
    fees[i] = Math.round(start * ((count - i) / 100000));
  }
  return fees;
}

function createRecords(tiers, count = 3) {
  const records = {};
  for (let i = 0; i < count; i++) {
    const name = `name${i + 1}`;
    const obj = {
      tier: tiers[i].id,
      contractTxID: DEFAULT_ANT_CONTRACT_ID,
      endTimestamp: new Date('01/01/2025').getTime() / 1000,
    };
    records[name] = obj;
  }
  return records;
}

function createGateways(wallets: string[]) {
  // TODO write a better algo
  const gateways = {};
  gateways[wallets[0]] = {
    operatorStake: 50_000,
    delegatedStake: 301_000,
    status: 'networkJoined',
    vaults: [
      {
        balance: 40_000, // Positive integer
        end: 0, // At what block the lock ends.
        start: 1, // At what block the lock starts.
      },
      {
        balance: 10_000, // Positive integer
        end: 0, // At what block the lock ends.
        start: 1, // At what block the lock starts.
      },
    ],
    delegates: {
      [wallets[4]]: [
        {
          balance: 300_000, // Positive integer
          end: 5_000, // At what block the lock ends.
          start: 0, // At what block the lock starts.
        },
      ],
      [wallets[5]]: [
        {
          balance: 1_000, // Positive integer
          end: 2_500, // At what block the lock ends.
          start: 0, // At what block the lock starts.
        },
      ],
    },
    settings: {
      label: 'Arweave Community Gateway', // The friendly name used to label this gateway
      fqdn: 'arweave.net', // the fully qualified domain name this gateway can be reached at. eg arweave.net
      port: 443, // The port used by this gateway eg. 443
      protocol: 'https', // The protocol used by this gateway, either http or https
      openDelegation: false,
      delegateAllowList: [wallets[4], wallets[5]],
      note: 'The friendliest gateway to the whole permaweb',
    },
  };

  gateways[wallets[1]] = {
    operatorStake: 5_000, // this includes the additional vault we add below
    delegatedStake: 3_100, // this includes the additional delegate we add below
    status: 'networkJoined',
    vaults: [
      {
        balance: 5_000, // Positive integer
        end: 0, // At what block the lock ends.
        start: 1, // At what block the lock starts.
      },
    ],
    delegates: {
      [wallets[5]]: [
        {
          balance: 1_000, // Positive integer
          end: 0, // At what block the lock ends.
          start: 1, // At what block the lock starts.
        },
        {
          balance: 100, // Positive integer
          end: 0, // At what block the lock ends.
          start: 1, // At what block the lock starts.
        },
      ],
      [wallets[6]]: [
        {
          balance: 2_000, // Positive integer
          end: 0, // At what block the lock ends.
          start: 1, // At what block the lock starts.
        },
      ],
    },
    settings: {
      label: 'Slashme', // The friendly name used to label this gateway
      fqdn: 'slash-this-gateway.io', // the fully qualified domain name this gateway can be reached at. eg arweave.net
      port: 443, // The port used by this gateway eg. 443
      protocol: 'https', // The protocol used by this gateway, either http or https
      openDelegation: true,
      delegateAllowList: [],
      note: 'i do bad things',
    },
  };

  return gateways;
}

export async function setupInitialContractState(
  owner: string,
  wallets: string[],
): Promise<IOState> {
  const state: IOState = DEFAULT_INITIAL_STATE as unknown as IOState;
  const tiers = createTiers();
  // set the tiers
  state.tiers = {
    current: tiers.reduce((current, tier, index) => {
      current[index + 1] = tier.id;
      return current;
    }, {}),
    history: tiers,
  };

  // set the fees
  state.fees = createFees();

  // create wallets and set balances
  state.balances = wallets.reduce((current, wallet) => {
    current[wallet] = DEFAULT_WALLET_FUND_AMOUNT;
    return current;
  }, {});
  // add balance to the owner
  state.balances = {
    ...state.balances,
    [owner]: DEFAULT_WALLET_FUND_AMOUNT,
  };

  // create some records
  state.records = createRecords(tiers);

  // set the owner to the first wallet
  state.owner = owner;

  // configure the necessary contract settings
  state.settings = {
    minNetworkJoinStakeAmount: 5_000,
    minDelegatedStakeAmount: 100,
    minGatewayJoinLength: 2,
    gatewayLeaveLength: 2,
    delegatedStakeWithdrawLength: 2,
    operatorStakeWithdrawLength: 2,
  };

  // configure some basic gateways
  state.gateways = createGateways(wallets);

  return state;
}

export function getLocalWallet(index = 0): JWKInterface {
  const wallet = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../wallets/${index}`), 'utf8'),
  ) as unknown as JWKInterface;
  return wallet;
}

export function getLocalArNSContractId(): string {
  const contract = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `../contract/arns_contract.json`),
      'utf8',
    ),
  ) as unknown as IOState & { id: string };
  return contract.id;
}

export * from '../../src/utilities';
export * from '../../tools/utilities';
