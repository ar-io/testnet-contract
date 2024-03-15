import { IOState } from '../src/types';
import { getContractManifest, initialize, loadWallet, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    '_NctcA2sRy1-J4OmIQZbYFPM17piNcbdBPH2ncX2RL8';

  // load local wallet
  const wallet = loadWallet();

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = await warp
    .contract<IOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

  const writeInteraction = await contract.dryWrite(
    {
      function: 'evolveState',
    },
    // {
    //   disableBundling: true,
    // },
  );
  console.log(JSON.stringify(writeInteraction, null, 2));
})();
