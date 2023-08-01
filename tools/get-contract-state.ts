import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from './constants';
import { getCurrentBlockHeight } from './utilities';

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    'GfrHPxXyfuxNNdGvzHl_5HFX711jZsG3OE8qmG-UqlY';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('fatal');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet();

  // Get the key file used for the distribution
  // const wallet: JWKInterface = JSON.parse(
  //   await fs.readFileSync(keyfile).toString(),
  // );

  // Read the ArNS Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  //pst.connect(wallet);
  console.log(`balance`, await pst.readState());
})();
