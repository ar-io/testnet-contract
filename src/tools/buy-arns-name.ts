import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from '../constants';
import { deployedContracts } from '../deployed-contracts';

(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // This is the name that will be purchased in the Arweave Name System Registry
  const nameToBuy = 'parking-lot';

  // This is the ANT Smartweave Contract TX ID that will be added to the registry. It must follow the ArNS ANT Specification
  const contractTxId = 'THX7vy1LIjN6Zna1Rs1ZzQqm_xH2V0UGUA2Lckyl8gA';
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the production ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId = deployedContracts.contractTxId;

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
    'Buying the record, %s using the ANT %s',
    nameToBuy,
    contractTxId,
  );
  const recordTxId = await pst.writeInteraction({
    function: 'buyRecord',
    name: nameToBuy,
    contractTransactionId: contractTxId, // TODO: separate script to create and buy an arns name using 'atomic' transaction ID
  });
  console.log('Finished purchasing the record: %s', recordTxId);
})();
