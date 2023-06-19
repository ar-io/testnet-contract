import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  SourceType,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import Arweave from 'arweave';

(async () => {
  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');
  const arweave = new Arweave({
    host: 'ar-io.dev',
    port: 443,
    protocol: 'https'
  })

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
    arweave
  ).use(new DeployPlugin());

  // Get the key file used for the distribution
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());
  const walletAddress = await arweave.wallets.getAddress(wallet);
  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // load state of contract
  const TEST_ARNS_CONTRACT_TX_ID = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';
  const { cachedValue: { state: existingContractState }} = await warp.contract(TEST_ARNS_CONTRACT_TX_ID).readState();
  
  const forkedState = {
    ...(existingContractState as IOState), 
    balances: {
      [walletAddress]: 10_000_000_000_000,
      'ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo': 10_000_000_000,
      '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo': 10_000_000_000,
    }
  }
  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(forkedState),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          sourceType: SourceType.ARWEAVE, // evaluation is restricted to only L1 arweave transactions (does not load any interactions submitted to warp sequencer)
          unsafeClient: 'skip',
          internalWrites: true,
          useKVStorage: true, // tells evaluators the key value storage is used for storing contract state
          maxCallDepth: 3, // maximum allowed of cross contract, calls - we may want to set this to a larger number (e.g. 5) - relevant when evaluting a contract, if this is exceed for an interaction, error will be thrown
          remoteStateSyncEnabled: false, // disallows contract from being evaluated from remote source (r.e. D.R.E) - TODO: this should be validated
          waitForConfirmation: true, // contract allows interaction to wait for confirmations when interactions are submitted against as a part of evalutation
          updateCacheForEachInteraction: true, // required for internal writes - increases performance, but takes memory hit
          maxInteractionEvaluationTimeSeconds: 60, // TODO: we may want to set this, doesn't look like anything by default
          allowBigInt: false, // big int cannot be serialized to JSON, but with Key/Value store, maybe we set this to true? TODO: determine if we want BigInt
          throwOnInternalWriteError: true,
        }
      }
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
