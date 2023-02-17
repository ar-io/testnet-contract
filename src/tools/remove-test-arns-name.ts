import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { testKeyfile } from '../constants';
import { deployedTestContracts } from '../deployed-contracts';

(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // This is the name that will be removed from the Arweave Name System Registry testnet
  const nameToRemove = 'another-one';

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId = deployedTestContracts.contractTxId;

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');

  // Initialize SmartWeave
  const warp = WarpFactory.forTestnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(testKeyfile).toString(),
  );

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  // Buy the available record in ArNS Registry
  console.log('Removing the test record, %s', nameToRemove);
  const recordTxId = await pst.writeInteraction({
    function: 'removeRecord',
    name: nameToRemove,
  });
  console.log('Finished removing the record. ID: %s', recordTxId);
})();
