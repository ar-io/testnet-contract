import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { testKeyfile } from '../constants';

(async () => {
  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    'rNR8SmcQLefBHZ-d-oJ9jbqmQxHGB_9bjdNipmsio-s';

  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forTestnet(
    {
      ...defaultCacheOptions,
    },
    true,
  );

  // Get the key file used
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(testKeyfile).toString(),
  );

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsRegistryContractTxId);
  contract.connect(wallet);

  // ~~ Read contract source and initial state files ~~
  const newSource = fs.readFileSync(
    path.join(__dirname, '../../dist/contract.js'),
    'utf8',
  );

  // Create the evolved source code tx
  const evolveSrcTx = await warp.createSourceTx({ src: newSource }, wallet);
  const evolveSrcTxId = await warp.saveSourceTx(evolveSrcTx, true);
  if (evolveSrcTxId === null) {
    return 0;
  }

  // stick to L1's for now
  const evolveInteractionTXId = await contract.evolve(evolveSrcTxId, {
    disableBundling: true,
  });

  console.log(
    'Finished evolving the ArNS Smartweave Contract %s with TX %s. New contract id is: %s',
    arnsRegistryContractTxId,
    evolveInteractionTXId.originalTxId,
    evolveSrcTxId,
  );
})();
