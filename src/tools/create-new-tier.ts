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
  const arnsRegistryContractTxId = 'X_nDpgF8TwW1NJw4HXWmDroiiy36cRNYZqGDGgcFlzI';

  // ~~ Initialize `LoggerFactory` ~~
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

  const txId = await pst.dryWrite({
    function: 'createNewTier',
    newTier: {
        fee: 100,
        settings:{
            maxUndernames: 100
        }   
    }
  });

  console.log('New tier created: %s', txId);
})();
