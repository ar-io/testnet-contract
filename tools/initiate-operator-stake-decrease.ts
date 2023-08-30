import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from './constants';

// This script will initiate decreasing a gateway operator's stake
// The staked tokens will be returned after the withdrawal period has elapsed
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  // the ID of the staked vault that is to be unlocked and decreased
  const id = 1;

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
    function: 'initiateOperatorStakeDecrease',
    id,
  });

  // eslint-disable-next-line no-console
  console.log(
    `${walletAddress} successfully submitted request to initiate decreasing gateway stake with TX id: ${txId}`,
  );
})();
