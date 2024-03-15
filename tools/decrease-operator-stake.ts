import { JWKInterface } from 'arweave/node/lib/wallet';

import { IOState } from '../src/types';
import {
  arweave,
  getContractManifest,
  initialize,
  loadWallet,
  warp,
} from './utilities';

/* eslint-disable no-console */
// This script will initiate decreasing a gateway operator's stake
// The staked tokens will be returned after the withdrawal period has elapsed
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  // simple setup script
  initialize();

  // the qty of the staked vault that is to be unlocked and decreased
  const qty = 1;

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

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
  const contract = await warp
    .contract<IOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

  const txId = await contract.writeInteraction(
    {
      function: 'decreaseOperatorStake',
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
