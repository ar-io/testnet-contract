import { JWKInterface } from 'arweave/node/lib/wallet';
import fs from 'fs';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import { getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // load local wallet
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = await warp
    .contract<IOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

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
