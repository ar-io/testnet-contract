import { ArweaveSigner, mIOToken } from '@ar.io/sdk';
import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import { arweave, initialize, loadWallet, networkContract } from '../utilities';
import questions from './questions';

(async () => {
  // simple setup script
  initialize();

  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();

  const defaultAddress = await arweave.wallets.jwkToAddress(wallet);
  const gatewayDetails = await inquirer.prompt(
    questions.getBalance(defaultAddress),
  );

  const signer = new ArweaveSigner(wallet);
  const balanceMIO = await networkContract(signer).getBalance({
    address: gatewayDetails.address,
  });

  // eslint-disable-next-line;
  console.log(`Balance: ${new mIOToken(balanceMIO).toIO().valueOf()} IO`);
})();
