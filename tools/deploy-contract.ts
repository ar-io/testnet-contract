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
  const jwk = process.env.JWK
    ? process.env.JWK
    : await fs.readFileSync(keyfile).toString();

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

  // Get the key file used for the distribution
  const wallet = JSON.parse(jwk);
  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // load state of contract
  const PREVIOUS_ARNS_CONTRACT_TX_ID =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';
  const {
    cachedValue: { state: existingContractState },
  } = await warp
    .contract(PREVIOUS_ARNS_CONTRACT_TX_ID)
    .setEvaluationOptions({
      internalWrites: true,
      unsafeClient: 'skip',
      updateCacheForEachInteraction: true,
    })
    .readState();
  const { approvedANTSourceCodeTxs, evolve, ...relevantState } =
    existingContractState as any;
  const forkedState = {
    ...(relevantState as IOState),
  };
  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(forkedState),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          sourceType: SourceType.ARWEAVE, // evaluation is restricted to only L1 arweave transactions (does not load any interactions submitted to warp sequencer)
          internalWrites: true,
          useKVStorage: true, // tells evaluators the key value storage is used for storing contract state
          updateCacheForEachInteraction: true, // required for internal writes - increases performance, but takes memory hit
          maxInteractionEvaluationTimeSeconds: 60, // TODO: we may want to set this, doesn't look like anything by default
          throwOnInternalWriteError: true,
        },
      },
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId); // eslint-disable-line no-console
})();
