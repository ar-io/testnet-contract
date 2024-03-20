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
// This script will initiate decreasing a delegates stake to a gateway
// The staked tokens will be returned after the withdrawal period has elapsed
// Only the delegated staker's wallet owner is authorized to withdraw
(async () => {
  // simple setup script
  initialize();

  // The quantity of the delegated stake that is to be decreased and unlocked
  // This must not bring the delegated staker below the minimum amount required by the gateway
  // To completely withdraw delegated stake, add the full quantity amount
  const qty = 500;

  // the targetted gateway that the delegated stake is to be withdrawn from
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
      function: 'decreaseDelegateStake',
      qty,
      target,
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted request to initiate decreasing delegate stake with TX id: ${txId?.originalTxId}`,
  );
})();
