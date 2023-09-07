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

/* eslint-disable no-console */
(async () => {
  // load local wallet
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK
      ? process.env.JWK
      : await fs.readFileSync(keyfile).toString(),
  );

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

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

  const evolveInteractionTXId = await contract.writeInteraction(
    { function: 'evolve', value: evolveSrcTxId },
    {
      disableBundling: true,
    },
  );

  console.log(
    'Finished evolving the ArNS Smartweave Contract %s with interaction %s. New source code is: %s',
    arnsContractTxId,
    evolveInteractionTXId?.originalTxId,
    evolveSrcTxId,
  );
})();
