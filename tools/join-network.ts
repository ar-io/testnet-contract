import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { keyfile } from './constants';
import { arweave, getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
// This script will join a gateway to the ar.io network, identified by the gateway operator's wallet address
// A minimum amount of tokens must be staked to join, along with other settings that must be configured
// Only the gateway's wallet owner is authorized to adjust these settings or leave the network in the future
(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // the quantity of tokens to stake.  Must be greater than the minimum
  const qty = 100_000;

  // the friendly label for this gateway
  const label = 'Permagate';

  // the fully qualified domain name for this gateway eg. arweave.net
  const fqdn = 'permagate.io';

  // the port used for this gateway eg. 443
  const port = 443;

  // the application layer protocol used by this gateway eg http or https
  const protocol = 'https';

  // an optional gateway properties file located at this Arweave transaction id eg.
  const properties = 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44';

  // an optional, short note to further describe this gateway and its status
  const note = 'Owned and operated by DTF.';

  // The observer wallet public address eg.iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA which is used to upload observation reports
  const observerWallet = '';

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Connect the ArNS Registry Contract
  const contract = await warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`);

  console.log('Connected to contract with wallet: %s', walletAddress);
  const txId = await contract.writeInteraction(
    {
      function: 'joinNetwork',
      observerWallet,
      qty,
      label,
      fqdn,
      port,
      protocol,
      properties,
      note,
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully submitted request to join the network with TX id: ${JSON.stringify(
      txId,
      null,
      2,
    )}`,
  );
})();
