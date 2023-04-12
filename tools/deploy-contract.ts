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
  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  ).use(new DeployPlugin());

  // Get the key file used for the distribution
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );
  const stateFromFile: IOState = JSON.parse(
    fs.readFileSync(path.join(__dirname, './initial-state.json'), 'utf8'),
  );

  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(stateFromFile),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          internalWrites: true,
          throwOnInternalWriteError: true,
          sourceType: SourceType.ARWEAVE,
        }
      }
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
