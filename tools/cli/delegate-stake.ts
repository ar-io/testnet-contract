import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import { IOState } from '../../src/types';
import {
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

  const gatewayDetails = await inquirer.prompt(questions.delegateStake());

  // gate the contract txId
  const arnsContractTxId = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Connect the ArNS Registry Contract
  const contract = await warp
    .contract<IOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

  const confirm = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: `CONFIRM DELEGATION DETAILS? ${JSON.stringify(gatewayDetails)} >`,
  });

  if (confirm.confirm) {
    const payload = {
      function: 'delegateStake',
      target: gatewayDetails.target,
      qty: gatewayDetails.qty,
    };
    const dryWrite = await contract.dryWrite(payload);

    if (dryWrite.type === 'error' || dryWrite.errorMessage) {
      console.error('Failed to delegate stake:', dryWrite.errorMessage);
      return;
    }

    console.log('Submitting transaction to delegate stake...');

    const txId = await contract.writeInteraction(payload, {
      disableBundling: true,
    });
    // eslint-disable-next-line;
    console.log(
      `Successfully submitted request to join the network. TxId: ${txId?.originalTxId}`,
    );
  }
})();
