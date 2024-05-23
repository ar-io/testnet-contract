import {
  ArweaveSigner,
  Gateway,
  IOToken,
  UpdateGatewaySettingsParams,
} from '@ar.io/sdk';
import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import { arweave, initialize, loadWallet, networkContract } from '../utilities';
import questions from './questions';

(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  const signer = new ArweaveSigner(wallet);

  const existingGatewayDetails: Gateway | undefined = await networkContract(
    signer,
  ).getGateway({
    address: walletAddress,
  });

  if (!existingGatewayDetails) {
    console.error('Gateway not found with address:', walletAddress);
    return;
  }

  const gatewayDetails = await inquirer.prompt(
    questions.gatewaySettings(walletAddress, existingGatewayDetails),
  );

  const confirm = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: `CONFIRM UPDATED GATEWAY DETAILS? ${JSON.stringify(
      gatewayDetails,
    )} >`,
  });

  if (confirm.confirm) {
    const payload: UpdateGatewaySettingsParams = {
      observerWallet: gatewayDetails.observerWallet,
      allowDelegatedStaking: gatewayDetails.allowDelegatedStaking,
      delegateRewardShareRatio: gatewayDetails.delegateRewardShareRatio,
      autoStake: gatewayDetails.autoStake,
      minDelegatedStake: new IOToken(gatewayDetails.minDelegatedStake).toMIO(),
      note: gatewayDetails.note,
      properties: gatewayDetails.properties,
      protocol: gatewayDetails.protocol,
      port: gatewayDetails.port,
      fqdn: gatewayDetails.fqdn,
      label: gatewayDetails.label,
    };

    const { id } = await networkContract(signer).updateGatewaySettings(payload);
    // eslint-disable-next-line
    console.log(
      `Successfully submitted request to update gateway. TxId: ${id}`,
    );
  }
})();
