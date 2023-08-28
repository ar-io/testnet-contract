import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { IOState } from '../src/types';
import { keyfile } from './constants';

(async () => {
  const jwk = process.env.JWK
    ? process.env.JWK
    : await fs.readFileSync(keyfile).toString();

  // This is the mainnet ArNS Registry Smartweave Contract TX ID version 1.7
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
    },
    true,
  );

  // Get the key file used
  const wallet: JWKInterface = JSON.parse(jwk);

  // Read the ArNS Registry Contract
  const contract = warp.pst(contractTxId).setEvaluationOptions({
    internalWrites: true,
    unsafeClient: 'skip',
    updateCacheForEachInteraction: true,
  });
  contract.connect(wallet);
  const writeInteraction = await contract.writeInteraction(
    {
      function: 'evolveState',
    },
    {
      disableBundling: true,
    },
  );
  console.log('Write interaction', writeInteraction);
})();
