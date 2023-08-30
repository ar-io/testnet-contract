import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from '../constants';

// This script will stake more tokens to an existing joined gateway
// Only the gateway's wallet owner is authorized to increase its own stake
(async () => {
  // the quantity of tokens to stake
  const qty = 10_000;

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
    function: 'increaseOperatorStake',
    qty,
  });

  console.log(
    `${walletAddress} successfully submitted gateway stake increase with TX id: ${txId}`,
  );
})();
