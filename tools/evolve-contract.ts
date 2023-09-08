import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { keyfile } from './constants';

// ~~ Initialize `LoggerFactory` ~~
LoggerFactory.INST.logLevel('none');

/* eslint-disable no-console */
(async () => {
  // load local wallet
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
    },
    true,
  ).use(new DeployPlugin());

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsContractTxId);
  contract.connect(wallet);

  // ~~ Read contract source and initial state files ~~
  const newLocalSourceCodeJS = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // Create the evolved source code tx
  const evolveSrcTx = await warp.createSource(
    { src: newLocalSourceCodeJS },
    wallet,
    true,
  );
  const evolveSrcTxId = await warp.saveSource(evolveSrcTx, true);
  if (evolveSrcTxId === null) {
    return 0;
  }

  // eslint-disable-next-line
  const evolveInteractionTXId = await contract.writeInteraction(
    { function: 'evolve', value: evolveSrcTxId },
    {
      disableBundling: true,
    },
  );

  // DO NOT CHANGE THIS - it's used by github actions
  console.log(evolveSrcTxId);
})();
