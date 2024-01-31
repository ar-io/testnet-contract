import * as fs from 'fs';

import { IOState } from '../src/types';
import { keyfile } from './constants';
import { getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // This is the name that will be purchased in the Arweave Name System Registry
  const nameToBuy = process.env.ARNS_NAME ?? 'a-test-name';

  // This is the ANT Smartweave Contract TX ID that will be added to the registry. It must follow the ArNS ANT Specification
  const contractTxId =
    process.env.ANT_CONTRACT_TX_ID ??
    'gh673M0Koh941OIITVXl9hKabRaYWABQUedZxW-swIA';

  // The lease time for purchasing the name
  const years = 1;

  // load local wallet
  const wallet = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = await warp
    .contract<IOState>(arnsContractTxId)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

  contract.connect(wallet);

  // check if this name exists in the registry, if not exit the script.
  const currentState = await contract.readState();
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
  const recordTxId = await contract.writeInteraction(
    {
      function: 'buyRecord',
      name: nameToBuy,
      contractTxId,
      years,
    },
    {
      disableBundling: true,
    },
  );
  console.log('Finished purchasing the record: %s', recordTxId);
})();
