import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import { arweave, initialize, loadWallet, warp } from './utilities';

/* eslint-disable no-console */
// This script will stake more tokens to an existing joined gateway
// Only the gateway's wallet owner is authorized to increase its own stake
(async () => {
  // simple setup script
  initialize();

  // the quantity of tokens in IO to stake
  const qty = 10_000;

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  // gate the contract txId
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // Read the ANT Registry Contract
  const contract = warp.contract<IOState>(contractTxId).connect(wallet);

  const writeInteraction = await contract.writeInteraction(
    {
      function: 'increaseOperatorStake',
      qty,
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted gateway stake increase with TX id: ${writeInteraction?.originalTxId}`,
  );
})();
