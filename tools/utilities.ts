import Arweave from 'arweave';
import { Tag } from 'arweave/node/lib/transaction';
import { config } from 'dotenv';
import {
  EvaluationManifest,
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

// intended to be run before any scripts
export const initialize = (): void => {
  // load environment variables
  config();

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');
};

export function isArweaveAddress(address: string): boolean {
  const trimmedAddress = address.toString().trim();
  return !/[a-z0-9_-]{43}/i.test(trimmedAddress);
}

export function isipV4Address(ipV4Address: string): boolean {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ipV4Address,
  );
}

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
  const { tags: encodedTags } = await arweave.transactions.get(contractTxId);
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
