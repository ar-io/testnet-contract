import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from '../constants';

// This script will initiate decreasing a gateway operator's stake
// The staked tokens will be returned after the withdrawal period has elapsed
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  // the ID of the staked vault that is to be unlocked and decreased
  const id = 1;

  // gateway address registry contract
  const GATEWAY_ADDRESS_REGISTRY_ADDRESS =
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

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

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // Read the ANT Registry Contract
  const pst = warp.pst(GATEWAY_ADDRESS_REGISTRY_ADDRESS);
  pst.connect(wallet);

  const txId = await pst.writeInteraction({
    function: 'initiateOperatorStakeDecrease',
    id,
  });

  console.log(
    `${walletAddress} successfully submitted request to initiate decreasing gateway stake with TX id: ${txId}`,
  );
})();
