import { IOState } from '@/contracts/types/types.js';
import Arweave from 'arweave';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from '../constants';

(async () => {
  // ~~ Initialize Arweave ~~
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );
  // Get the key file used for the distribution
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../../dist/contract.js'),
    'utf8',
  );
  const stateFromFile: IOState = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../dist/contracts/initial-state.json'),
      'utf8',
    ),
  );

  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(stateFromFile),
      src: contractSrc,
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
