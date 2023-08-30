import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from '../constants';

// This script will update the settings for a gateway that is alreadyjoined to the network
// Only the gateway's wallet owner is authorized to adjust these settings
(async () => {
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

  // Include any settings as needed below
  const txId = await pst.writeInteraction({
    function: 'updateGatewaySettings',
    label,
    fqdn,
    // port,
    // protocol,
    // properties,
    // note
  });

  console.log(
    `${walletAddress} successfully updated gateway settings with TX id: ${txId}`,
  );
})();
