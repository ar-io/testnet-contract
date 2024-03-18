import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import { IOState } from '../../src/types';
import {
  arnsContractTxId,
  arweave,
  getContractManifest,
  initialize,
  loadWallet,
  networkContract,
  warp,
} from '../utilities';
import questions from './questions';

(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  const mIOBalance: number = await networkContract.getBalance({
    address: walletAddress,
  });

  const gatewayDetails = await inquirer.prompt(
    questions.increaseOperatorStake(mIOBalance / 1000000),
  );

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
    message: `CONFIRM INCREASE OPERATOR STAKE DETAILS? ${JSON.stringify(
      gatewayDetails,
    )} >`,
  });

  if (confirm.confirm) {
    const payload = {
      function: 'increaseOperatorStake',
      qty: gatewayDetails.qty,
    };
    const dryWrite = await contract.dryWrite(payload);

    if (dryWrite.type === 'error' || dryWrite.errorMessage) {
      console.error(
        'Failed to increase operator stake:',
        dryWrite.errorMessage,
      );
      return;
    }

    console.log('Submitting transaction to increase operator stake...');

    const txId = await contract.writeInteraction(payload, {
      disableBundling: true,
    });
    // eslint-disable-next-line;
    console.log(
      `Successfully submitted request to increase operator stake. TxId: ${txId?.originalTxId}`,
    );
  }
})();
