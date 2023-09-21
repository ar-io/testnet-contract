import * as fs from 'fs';
import path from 'path';
import { LoggerFactory, SourceType } from 'warp-contracts';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import { arweave, warp } from './utilities';

(async () => {
  const wallet = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // load state of contract
  const ARNS_CONTRACT_TX_ID =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~;

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
