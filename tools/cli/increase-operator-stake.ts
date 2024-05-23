import { ArweaveSigner, IOToken, mIOToken } from '@ar.io/sdk';
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
  const balanceMIO = await networkContract(signer).getBalance({
    address: walletAddress,
  });

  const balanceIO = new mIOToken(balanceMIO).toIO();
  const gatewayDetails = await inquirer.prompt(
    questions.increaseOperatorStake(balanceIO.valueOf()),
  );

  const confirm = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: `CONFIRM INCREASE OPERATOR STAKE DETAILS? ${JSON.stringify(
      gatewayDetails,
    )} >`,
  });

  if (confirm.confirm) {
    const { id } = await networkContract(signer).increaseOperatorStake({
      qty: new IOToken(gatewayDetails.qty).toMIO(),
    });
    // eslint-disable-next-line;
    console.log(
      `Successfully submitted request to increase operator stake. TxId: ${id}`,
    );
  }
})();
