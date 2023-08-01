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
    'GfrHPxXyfuxNNdGvzHl_5HFX711jZsG3OE8qmG-UqlY';
  const {
    cachedValue: { state: existingContractState },
  } = await warp
    .contract(PREVIOUS_ARNS_CONTRACT_TX_ID)
    .setEvaluationOptions({
      internalWrites: true,
      maxCallDepth: 3,
      waitForConfirmation: true,
      unsafeClient: 'skip',
      updateCacheForEachInteraction: true,
    })
    .readState();
  const { approvedANTSourceCodeTxs, evolve, ...relevantState } =
    existingContractState as any;
  const forkedState = {
    ...(relevantState as IOState),
  };
  // TODO: do some AJV validation the the initial state meets our spec
  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(forkedState),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          internalWrites: true,
          throwOnInternalWriteError: true,
          sourceType: SourceType.ARWEAVE,
        },
      },
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId); // eslint-disable-line no-console
})();
