import { JWKInterface } from 'arweave/node/lib/wallet';
import readline from 'readline';

import { IOState } from '../src/types';
import {
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
  // Simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  // Get the target wallet address from the user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the quantity of tokens to delegate (Minimum 100tIO): ', async (qtyInput: string) => {
    const qty = parseInt(qtyInput, 10);

    if (isNaN(qty) || qty < 100) {
      console.log('Error: Quantity must be a number greater than or equal to 100tIO.');
      rl.close();
      return;
    }

    rl.question('Enter the target wallet address: ', async (target: string) => { 
      rl.close();

      // Gate the contract txId
      const arnsContractTxId =
        process.env.ARNS_CONTRACT_TX_ID ??
        'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

      // Get wallet address
      const walletAddress = await arweave.wallets.getAddress(wallet);

      // Get contract manifest
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
        `${walletAddress} successfully submitted request to delegate stake of ${qty} tokens to ${target} with TX id: ${txId?.originalTxId}`,
      );
    });
  });
})();
