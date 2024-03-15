import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { IOState, IOToken } from '../src/types';
import { keyfile } from './constants';
import { arweave, getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // // The recipient target of the token transfer
  // const target = '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo';

  // // The amount of tokens to be transferred
  const qty = new IOToken(500).toMIO().valueOf();
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(fs.readFileSync(keyfile).toString());

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

  const { cachedValue } = (await contract.readState()) as any;

  const walletAddresses = new Set(Object.keys(cachedValue.state.balances));
  const gatewayAddresses = new Set(Object.keys(cachedValue.state.gateways));

  const missing = new Set(
    [...gatewayAddresses]
      .map((gateway) => (!walletAddresses.has(gateway) ? gateway : null))
      .filter((x) => x !== null),
  );

  console.log('Missing gateways:', missing);

  for (const target of missing) {
    // Read the ANT Registry Contract
    console.log(
      'Transferring %s tokens from %s to %s',
      qty,
      walletAddress,
      target,
    );
    const result = await contract.writeInteraction(
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
      'Finished transferring token to %s',
      target,
      result?.originalTxId,
    );
  }
})();
