import { JWKInterface } from 'arweave/node/lib/wallet';
import inquirer from 'inquirer';

import { IOState } from '../../src/types';
import {
  arnsContractTxId,
  arweave,
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

  const address = await arweave.wallets.jwkToAddress(wallet);

  const gatewayDetails = await inquirer.prompt(questions.getBalance(address));

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

  const payload = {
    function: 'balance',
    target: gatewayDetails.address,
  };

  const { result } = await contract.viewState<
    { function: string; target: string },
    { address: string; balance: number }
  >(payload);
  // eslint-disable-next-line;
  console.log(`Balance: ${result.balance / 1_000_000} IO`);
})();
