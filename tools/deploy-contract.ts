import * as fs from 'fs';
import path from 'path';
import { SourceType } from 'warp-contracts';

import { IOState } from '../src/types';
import {
  arweave,
  getContractManifest,
  initialize,
  loadWallet,
  warp,
} from './utilities';

(async () => {
  // simple setup script
  initialize();

  // load wallet
  const wallet = loadWallet();

  // load state of contract
  const ARNS_CONTRACT_TX_ID =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: ARNS_CONTRACT_TX_ID,
    arweave,
  });

  const contract = await warp
    .contract<IOState>(ARNS_CONTRACT_TX_ID)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${ARNS_CONTRACT_TX_ID}`);

  const {
    cachedValue: { state: existingContractState },
  } = await contract.readState();

  const forkedState: IOState = {
    ...(existingContractState as IOState),
    evolve: '', // clear out evolve so new source code is not overwritten
  };

  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(forkedState),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          // internalWrites: true,
          // useKVStorage: true, // tells evaluators the key value storage is used for storing contract state
          // updateCacheForEachInteraction: true, // required for internal writes - increases performance, but takes memory hit
          sourceType: SourceType.ARWEAVE,
        },
      },
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId); // eslint-disable-line no-console
})();
