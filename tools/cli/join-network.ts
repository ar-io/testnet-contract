import { ArweaveSigner, IOToken, JoinNetworkParams } from '@ar.io/sdk';
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
  const gatewayDetails = await inquirer.prompt(
    questions.gatewaySettings(walletAddress),
  );

  const confirm = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: `CONFIRM GATEWAY DETAILS? ${JSON.stringify(gatewayDetails)} >`,
  });

  if (confirm.confirm) {
    const payload: JoinNetworkParams = {
      observerWallet: gatewayDetails.observerWallet,
      autoStake: gatewayDetails.autoStake,
      allowDelegatedStaking: gatewayDetails.allowDelegatedStaking,
      delegateRewardShareRatio: gatewayDetails.delegateRewardShareRatio,
      minDelegatedStake: new IOToken(gatewayDetails.minDelegatedStake)
        .toMIO()
        .valueOf(),
      note: gatewayDetails.note,
      properties: gatewayDetails.properties,
      protocol: gatewayDetails.protocol,
      port: gatewayDetails.port,
      fqdn: gatewayDetails.fqdn,
      label: gatewayDetails.label,
      qty: new IOToken(gatewayDetails.qty).toMIO().valueOf(),
    };

    const { id } = await networkContract(signer).joinNetwork(payload);
    // eslint-disable-next-line
    console.log(
      `Successfully submitted request to join the network. TxId: ${id}`,
    );
  }
})();
