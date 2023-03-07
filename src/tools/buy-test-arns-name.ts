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
  // This is the name that will be purchased in the Arweave Name System Registry testnet
  const nameToBuy = 'another-one';

  // The lease time for purchasing the name
  const years = 1;

  // the Tier of the name purchased.  Tier 1 = 100 subdoins, Tier 2 = 1000 subdomains, Tier 3 = 10000 subdomains
  const tier = 1;

  // This is the ANT Smartweave Contract TX ID that will be added to the testnet registry
  const contractTxId = '6-H14K04w-_5t4u_TFJyVCzkt2szBmyoWSMRbniOQzw';
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId = deployedTestContracts.contractTxId;

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
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

  // check if this name exists in the registry, if not exit the script.
  const currentState = await pst.currentState();
  const currentStateString = JSON.stringify(currentState);
  const currentStateJSON = JSON.parse(currentStateString);
  if (currentStateJSON.records[nameToBuy] !== undefined) {
    console.log(
      'This name %s is already taken and is not available for purchase.  Exiting.',
      nameToBuy,
    );
    return;
  }

  // Buy the available record in ArNS Registry
  console.log(
    'Buying the test record, %s using the ANT %s',
    nameToBuy,
    contractTxId,
  );
  const recordTxId = await pst.writeInteraction({
    function: 'buyRecord',
    name: nameToBuy,
    tier,
    contractTxId,
    years,
  }, {
    disableBundling: true
  });
  console.log('Finished purchasing the record. ID: %s', recordTxId);
})();
