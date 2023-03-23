import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { keyfile } from '../constants';

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID version 1.7
  const arnsRegistryContractTxId =
    'k0yfvCpbusgE7a6JrqFVmoTWWJSQV4Zte3EVoLgd8dw';

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
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsRegistryContractTxId);
  contract.connect(wallet);

  // ~~ Read contract source and initial state files ~~
  const newLocalSourceCodeJS = fs.readFileSync(
    path.join(__dirname, '../../dist/contract.js'),
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

  console.log(
    'Finished evolving the ArNS Smartweave Contract %s with interaction %s. New source code is: %s',
    arnsRegistryContractTxId,
    evolveInteractionTXId.originalTxId,
    evolveSrcTx,
  );
})();
