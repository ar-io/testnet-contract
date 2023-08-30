import Arweave from 'arweave';
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

(async () => {
  const wallet = JSON.parse(
    process.env.JWK
      ? process.env.JWK
      : await fs.readFileSync(keyfile).toString(),
  );

  // load state of contract
  const ARNS_CONTRACT_TX_ID =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');
  const arweave = new Arweave({
    host: 'ar-io.dev',
    port: 443,
    protocol: 'https',
  });

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
    arweave,
  ).use(new DeployPlugin());

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  const {
    cachedValue: { state: existingContractState },
  } = await warp
    .contract(ARNS_CONTRACT_TX_ID)
    .setEvaluationOptions({
      internalWrites: true,
      unsafeClient: 'skip',
      updateCacheForEachInteraction: true,
    })
    .readState();

  // any state forks we want to do
  const forkedState = {
    ...(existingContractState as IOState),
    balances: {
      [walletAddress]: 1_000_000_000,
    },
  };
  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(forkedState),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          internalWrites: true,
          useKVStorage: true, // tells evaluators the key value storage is used for storing contract state
          updateCacheForEachInteraction: true, // required for internal writes - increases performance, but takes memory hit
          sourceType: SourceType.ARWEAVE,
        },
      },
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId); // eslint-disable-line no-console
})();
