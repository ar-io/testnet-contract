import { ArIOState } from '@ar.io/sdk';
import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import {
  arnsContractTxId,
  getContractManifest,
  initialize,
  loadWallet,
  warp,
} from '../utilities';
import questions from './questions';

(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  const reservedName = await inquirer.prompt(questions.createReservedName());

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Connect the ArNS Registry Contract
  const contract = await warp
    .contract<ArIOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

  const payload = {
    function: 'createReservedName',
    target: reservedName.target,
    name: reservedName.name,
    endTimestamp: reservedName.endTimestamp,
  };

  let attempts = 0;
  let lastErrorMessage;
  let result;
  while (attempts < 3) {
    const dryWrite = await contract.dryWrite(payload);
    if (dryWrite.type === 'error' || dryWrite.errorMessage) {
      lastErrorMessage = dryWrite.errorMessage ?? 'Unknown error';
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000)); // wait one second before retrying
    } else {
      // success - break
      result = dryWrite.state.reserved[reservedName.name];
      lastErrorMessage = undefined;
      break;
    }
  }

  if (lastErrorMessage) {
    console.error('Error:', lastErrorMessage);
    return;
  }

  const confirm = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: `CONFIRM RESERVED NAME DETAILS? ${JSON.stringify({
      name: reservedName.name,
      ...result,
    })} >`,
  });

  if (!confirm.confirm) {
    console.log('User cancelled the transaction.');
    return;
  }

  console.log('Submitting transaction to create reserved name...');

  const txId = await contract.writeInteraction(payload, {
    disableBundling: true,
  });
  // eslint-disable-next-line
  console.log(
    `Successfully submitted interaction to create reserved name. TxId: ${txId?.originalTxId}`,
  );
})();
