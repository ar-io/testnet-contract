import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from './constants';

// This script will finalize the leave network protocol and remove the gateway from the registry
// The gateway's wallet owner or any other user is authorized to finalize the leave network request
(async () => {
  // add the target wallet address to finalize the leave network request
  // target = 'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA'

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK
      ? process.env.JWK
      : await fs.readFileSync(keyfile).toString(),
  );

  // gate the contract txId
  const contractTxId =
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
  const pst = warp.pst(contractTxId);
  pst.connect(wallet);

  const txId = await pst.writeInteraction({
    function: 'finalizeLeave',
    // target
  });

  // eslint-disable-next-line no-console
  console.log(
    `${walletAddress} successfully submitted request to finalize leaving the network with TX id: ${txId}`,
  );
})();
