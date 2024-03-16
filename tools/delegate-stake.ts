import { JWKInterface } from 'arweave/node/lib/wallet';

import { IOState } from '../src/types';
import {
  arnsContractTxId,
  arweave,
  getContractManifest,
  initialize,
  loadWallet,
  warp,
} from './utilities';

/* eslint-disable no-console */
// This script will stake and delegate tokens to a gateway
// The staked tokens can earn a portion of the gateway's rewards
// Only the delegated staker's wallet owner is authorized to withdraw
(async () => {
  // simple setup script
  initialize();

  // The quantity of the delegated stake that is to be added
  // If this is the first stake placed with this gateway, it must be greater than the minimum amount required for this gateway
  const qty = 500;

  // the targetted gateway that the delegated stake is to be added to
  const target = 'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ';

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
      function: 'delegateStake',
      qty,
      target,
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted request to delegate stake with TX id: ${txId?.originalTxId}`,
  );
})();
