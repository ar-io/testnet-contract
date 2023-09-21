import { JWKInterface } from 'arweave/node/lib/wallet';
import fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from './constants';
import { arweave, getContractManifest, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // load local wallet
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  LoggerFactory.INST.logLevel('error');

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions);

  const writeInteraction = await contract.writeInteraction(
    {
      function: 'evolveState',
    },
    {
      disableBundling: true,
    },
  );
  console.log(JSON.stringify(writeInteraction, null, 2));
})();
