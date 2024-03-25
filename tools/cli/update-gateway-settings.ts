import { Gateway } from '@ar.io/sdk';
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

  const existingGatewayDetails: Gateway | undefined =
    await networkContract.getGateway({
      address: walletAddress,
    });

  if (!existingGatewayDetails) {
    console.error('Gateway not found with address:', walletAddress);
    return;
  }

  const gatewayDetails = await inquirer.prompt(
    questions.gatewaySettings(walletAddress, existingGatewayDetails),
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
    message: `CONFIRM UPDATED GATEWAY DETAILS? ${JSON.stringify(
      gatewayDetails,
    )} >`,
  });

  if (confirm.confirm) {
    const payload = {
      function: 'updateGatewaySettings',
      ...(gatewayDetails.observerWallet
        ? { observerWallet: gatewayDetails.observerWallet }
        : {}),
      ...(gatewayDetails.allowDelegatedStaking
        ? { allowDelegatedStaking: gatewayDetails.allowDelegatedStaking }
        : {}),
      ...(gatewayDetails.delegateRewardShareRatio
        ? {
            delegateRewardShareRatio: gatewayDetails.delegateRewardShareRatio,
          }
        : {}),
      ...(gatewayDetails.autoStake
        ? { autoStake: gatewayDetails.autoStake }
        : {}),
      ...(gatewayDetails.minDelegatedStake
        ? { minDelegatedStake: gatewayDetails.minDelegatedStake }
        : {}),
      ...(gatewayDetails.note ? { note: gatewayDetails.note } : {}),
      ...(gatewayDetails.properties
        ? { properties: gatewayDetails.properties }
        : {}),
      ...(gatewayDetails.protocol ? { protocol: gatewayDetails.protocol } : {}),
      ...(gatewayDetails.port ? { port: gatewayDetails.port } : {}),
      ...(gatewayDetails.fqdn ? { fqdn: gatewayDetails.fqdn } : {}),
      ...(gatewayDetails.label ? { label: gatewayDetails.label } : {}),
      // note: removing qty from the payload as it's not a valid field for updateGatewaySettings
    };
    const dryWrite = await contract.dryWrite(payload);

    if (dryWrite.type === 'error' || dryWrite.errorMessage) {
      console.error('Failed to update gateway:', dryWrite.errorMessage);
      return;
    }

    console.log('Submitting transaction to update gateway...');

    const txId = await contract.writeInteraction(payload, {
      disableBundling: true,
    });
    // eslint-disable-next-line
    console.log(
      `Successfully submitted request to update gateway. TxId: ${txId?.originalTxId}`,
    );
  }
})();
