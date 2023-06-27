import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { keyfile } from './constants';

(async () => {
  const jwk = process.env.JWK
    ? process.env.JWK
    : await fs.readFileSync(keyfile).toString();

  const arnsRegistryContractTxId =
<<<<<<< HEAD
    process.env.ARNS_CONTRACT_TX_ID ??
=======
>>>>>>> 26d7d1a (fix(auctions): update years, change initalPrice to startPrice in auctions, add getAuction function to get auction bids)
    'GfrHPxXyfuxNNdGvzHl_5HFX711jZsG3OE8qmG-UqlY';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
    },
    true,
  ).use(new DeployPlugin());

  // Get the key file used
  const wallet: JWKInterface = JSON.parse(jwk);

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsRegistryContractTxId);
  contract.connect(wallet);

  // ~~ Read contract source and initial state files ~~
  const newLocalSourceCodeJS = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // Create the evolved source code tx
  const evolveSrcTx = await warp.createSource(
    { src: newLocalSourceCodeJS },
    wallet,
    true,
  );
  const evolveSrcTxId = await warp.saveSource(evolveSrcTx, true);
  if (evolveSrcTxId === null) {
    return 0;
  }
  const evolveInteractionTXId = await contract.evolve(evolveSrcTxId, {
    disableBundling: true,
  });

  // eslint-disable-next-line
  console.log(
    'Finished evolving the ArNS Smartweave Contract %s with interaction %s. New source code is: %s',
    arnsRegistryContractTxId,
    evolveInteractionTXId?.originalTxId,
    evolveSrcTx,
  );
})();
