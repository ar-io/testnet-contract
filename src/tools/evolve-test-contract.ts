import { deployedTestContracts } from '@/deployed-contracts.js';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { testKeyfile } from '../constants';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

(async () => {
  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId = deployedTestContracts.contractTxId;

  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forTestnet(
    {
      ...defaultCacheOptions,
    },
    true,
  ).use(new DeployPlugin());

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
  const evolveSrcTx = await warp.createSource({ src: newSource }, wallet, true);
  const evolveSrcTxId = await warp.saveSource(evolveSrcTx, true);
  if (evolveSrcTxId === null) {
    return 0;
  }

  // stick to L1's for now
  const evolveInteractionTXId = await contract.evolve(evolveSrcTxId, {
    disableBundling: true,
  });

  console.log(
    'Finished evolving the ArNS Smartweave Contract %s with interaction %s. New source code id is: %s',
    arnsRegistryContractTxId,
    evolveInteractionTXId.originalTxId,
    evolveSrcTxId,
  );
})();
