import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from './constants';

/* eslint-disable no-console */
// This script will initiate leaving the network for a gateway that is already joined
// All tokens will be returned after the gateway waits through the withdrawal period
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  // there are no gateway parameters to fill out for this interaction

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK
      ? process.env.JWK
      : await fs.readFileSync(keyfile).toString(),
  );

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // Initialize Arweave
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
    },
    true,
  );

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsContractTxId);
  pst.connect(wallet);

  const txId = await pst.writeInteraction(
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
