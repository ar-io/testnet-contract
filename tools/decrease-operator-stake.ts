import { JWKInterface } from 'arweave/node/lib/wallet';

import { IOState, IOToken } from '../src/types';
import {
  arnsContractTxId,
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

  // the number of IO tokens to decrease the gateway operator's stake by
  const qty = new IOToken(100);

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

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
      qty: qty.toMIO().valueOf(),
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted request to initiate decreasing gateway stake with TX id: ${txId?.originalTxId}`,
  );
})();
