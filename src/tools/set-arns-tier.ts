import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from '../constants';

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    'R-DRqVv97e8cCya95qsH_Tpvmb9vidURYWlBL5LpSzo';

  const tier = 3;
  const maxSubdomains = 10000;
  const minTtlSeconds = 900;
  /*
      "1": {
      "maxSubdomains": 100,
      "minTtlSeconds": 3600
    },
    "2": {
      "maxSubdomains": 1000,
      "minTtlSeconds": 1800
    },
    "3": {
      "maxSubdomains": 10000,
      "minTtlSeconds": 900
    }
  */

  // Initialize Arweave
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  const txId = await pst.writeInteraction({
    function: 'setTier',
    tier,
    maxSubdomains,
    minTtlSeconds,
  });

  console.log('Finished set the ArNS tier: %s', txId);
})();
