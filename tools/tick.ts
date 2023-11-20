import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { keyfile } from './constants';
import { getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Connect the ArNS Registry Contract
  const contract = await warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`);

  const txId = await contract.writeInteraction(
    {
      function: 'tick',
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `Successfully ticked state of contract ${arnsContractTxId} with txId: ${JSON.stringify(
      txId,
      null,
      2,
    )}`,
  );
})();
