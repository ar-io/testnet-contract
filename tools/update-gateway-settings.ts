import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';

import { keyfile } from './constants';
import { arweave, getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
// This script will update the settings for a gateway that is already joined to the network
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
  initialize();

  // the friendly label for this gateway
  const label = 'Test Gateway';

  // the fully qualified domain name for this gateway eg. arweave.net
  const fqdn = 'permanence-testing.org';

  // uncomment the below settings and update as needed
  // the port used for this gateway eg. 443
  // const port = 443

  // the application layer protocol used by this gateway eg http or https
  // const protocol = 'https'

  // an optional gateway properties file located at this Arweave transaction id eg.
  // const properties = 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44'

  // an optional, short note to further describe this gateway and its status
  // const note = 'Give me feedback about this gateway at my Xwitter @testgatewayguy'

  // The observer wallet public address eg.iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA which is used to upload observation reports
  // const observerWallet = '';

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // gate the contract txId
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = await warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`);

  // Include any settings as needed below
  const writeInteraction = await contract.writeInteraction(
    {
      function: 'updateGatewaySettings',
      label,
      fqdn,
      // observerWallet,
      // port,
      // protocol,
      // properties,
      // note
    },
    {
      disableBundling: true,
    },
  );

  console.log(
    `${walletAddress} successfully updated gateway settings with TX id: ${writeInteraction?.originalTxId}`,
  );
})();
