import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import { getContractManifest, initialize, loadWallet, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

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
    .contract<IOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

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
