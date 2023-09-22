import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { keyfile } from './constants';
import { arweave, getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
// This script will initiate leaving the network for a gateway that is already joined
// All tokens will be returned after the gateway waits through the withdrawal period
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  // simple setup script
  initialize();

  // there are no gateway parameters to fill out for this interaction

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions);

  const txId = await contract.writeInteraction(
    {
      function: 'initiateLeave',
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted request to initiate leaving the network with TX id: ${txId}`,
  );
})();
