import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';
import inquirer from 'inquirer';

import { keyfile } from './constants';
import questions from './questions';

/* eslint-disable no-console */
// This script will stake more tokens to an existing joined gateway
// Only the gateway's wallet owner is authorized to increase its own stake
(async () => {
  
  const {qty} = await inquirer.prompt(questions.increaseOperatorStake());

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // gate the contract txId
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // Initialize Arweave
  const arweave = Arweave.init({
    host: 'ar-io.dev',
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
  const pst = warp.pst(contractTxId).connect(wallet);

  const writeInteraction = await pst.writeInteraction(
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
