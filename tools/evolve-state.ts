import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from './constants';

/* eslint-disable no-console */
(async () => {
  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // load local wallet
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK
      ? process.env.JWK
      : await fs.readFileSync(keyfile).toString(),
  );

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
  );

  // Read the ArNS Registry Contract
  const contract = warp
    .pst(arnsContractTxId)
    .setEvaluationOptions({
      internalWrites: true,
      updateCacheForEachInteraction: true,
      unsafeClient: 'skip',
    })
    .connect(wallet);

  //
  const writeInteraction = await contract.dryWrite(
    {
      function: 'evolveState',
    },
    // {
    //   disableBundling: true,
    // },
  );
  console.log(JSON.stringify(writeInteraction, null, 2));
})();
