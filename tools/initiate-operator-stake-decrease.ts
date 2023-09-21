import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from './constants';
import { arweave, getContractManifest, warp } from './utilities';

/* eslint-disable no-console */
// This script will initiate decreasing a gateway operator's stake
// The staked tokens will be returned after the withdrawal period has elapsed
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  // the qty of the staked vault that is to be unlocked and decreased
  const qty = 1;

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
  const pst = warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions);

  const txId = await pst.writeInteraction(
    {
      function: 'initiateOperatorStakeDecrease',
      qty,
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted request to initiate decreasing gateway stake with TX id: ${txId?.originalTxId}`,
  );
})();
