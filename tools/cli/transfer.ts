import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import { IOState, IOToken, mIOToken } from '../../src/types';
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

  const balanceMIO = await networkContract.getBalance({
    address: walletAddress,
  });

  const balanceIO = new mIOToken(balanceMIO).toIO();

  const gatewayDetails = await inquirer.prompt(
    questions.transfer(balanceIO.valueOf()),
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
    message: `CONFIRM TRANSFER DETAILS? ${JSON.stringify(gatewayDetails)} >`,
  });

  if (confirm.confirm) {
    const payload = {
      function: 'transfer',
      target: gatewayDetails.target,
      qty: new IOToken(gatewayDetails.qty).toMIO().valueOf(),
    };
    const dryWrite = await contract.dryWrite(payload);

    if (dryWrite.type === 'error' || dryWrite.errorMessage) {
      console.error('Failed to transfer:', dryWrite.errorMessage);
      return;
    }

    console.log('Submitting transaction to transfer tokens...');

    const txId = await contract.writeInteraction(payload, {
      disableBundling: true,
    });
    // eslint-disable-next-line;
    console.log(
      `Successfully submitted request to transfer tokens. TxId: ${txId?.originalTxId}`,
    );
  }
})();
