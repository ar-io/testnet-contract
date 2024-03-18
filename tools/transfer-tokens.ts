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
(async () => {
  // simple setup script
  initialize();

  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The recipient target of the token transfer
  const target = '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo';

  // The amount of tokens to be transferred in IO
  const qty = 10_000;
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

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

  const interaction = await contract.writeInteraction(
    {
      function: 'transfer',
      target,
      qty,
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `Successfully transferred ${qty} IO tokens from ${walletAddress} to ${target}. Interaction TX id: ${interaction?.originalTxId}`,
  );
})();
