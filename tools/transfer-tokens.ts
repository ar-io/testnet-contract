import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import { arweave, getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The recipient target of the token transfer
  const target = '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo';

  // The amount of tokens to be transferred
  const qty = 2500000;
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(fs.readFileSync(keyfile).toString());

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // Read the ANT Registry Contract
  console.log(
    'Transferring %s tokens from %s to %s',
    qty,
    walletAddress,
    target,
  );
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

  await contract.writeInteraction(
    {
      function: 'transfer',
      target,
      qty,
    },
    {
      disableBundling: true,
    },
  );

  console.log('Finished transferring tokens');
})();
