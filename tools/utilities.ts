import { ArIO } from '@ar.io/sdk';
import Arweave from 'arweave';
import { Tag } from 'arweave/node/lib/transaction';
import { config } from 'dotenv';
import * as fs from 'fs';
import {
  EvaluationManifest,
  JWKInterface,
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { keyfile } from './constants';

// gate the contract txId
export const arnsContractTxId = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

// intended to be run before any scripts
export const initialize = (): void => {
  // load environment variables
  config();

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');
};

export const loadWallet = (): JWKInterface => {
  if (process.env.JWK) {
    return JSON.parse(process.env.JWK);
  }
  if (fs.existsSync(keyfile)) {
    return JSON.parse(fs.readFileSync(keyfile, 'utf8'));
  }

  throw new Error(
    'No wallet found. Provide it via WALLET_FILE_PATH or JWK, or update the `keyfile` path in constants.ts',
  );
};

export function isArweaveAddress(address: string): boolean {
  const trimmedAddress = address.toString().trim();
  const ARWEAVE_TX_REGEX = new RegExp('^[a-zA-Z0-9-_s+]{43}$');
  return ARWEAVE_TX_REGEX.test(trimmedAddress);
}

export function isipV4Address(ipV4Address: string): boolean {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ipV4Address,
  );
}

export const networkContract = new ArIO({
  contractTxId:
    process.env.ARNS_CONTRACT_TX_ID ||
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U',
});

export const arweave = new Arweave({
  host: 'ar-io.dev',
  port: 443,
  protocol: 'https',
});

export const warp = WarpFactory.forMainnet(
  {
    ...defaultCacheOptions,
  },
  true,
  arweave,
).use(new DeployPlugin());

export function getTotalSupply(state: any): number {
  let totalSupply = 0;
  for (const key of Object.keys(state.balances)) {
    totalSupply += state.balances[key];
  }
  return totalSupply;
}

const defaultArweave = arweave;
export async function getContractManifest({
  arweave = defaultArweave,
  contractTxId,
}: {
  arweave?: Arweave;
  contractTxId: string;
}): Promise<EvaluationManifest> {
  const { tags: encodedTags = [] } = await arweave.transactions
    .get(contractTxId)
    .catch(() => ({ tags: [] }));
  const decodedTags = tagsToObject(encodedTags);
  const contractManifestString = decodedTags['Contract-Manifest'] ?? '{}';
  const contractManifest = JSON.parse(contractManifestString);
  return contractManifest;
}

export function tagsToObject(tags: Tag[]): {
  [x: string]: string;
} {
  return tags.reduce((decodedTags: { [x: string]: string }, tag) => {
    const key = tag.get('name', { decode: true, string: true });
    const value = tag.get('value', { decode: true, string: true });
    decodedTags[key] = value;
    return decodedTags;
  }, {});
}
