import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import { LoggerFactory } from 'warp-contracts';

import { IOState } from '../src/types';
import {
  arnsContractTxId,
  arweave,
  getContractManifest,
  initialize,
  loadWallet,
  warp,
} from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // override log settings
  LoggerFactory.INST.logLevel('error');

  // load local wallet
  const wallet: JWKInterface = loadWallet();

  // load state of contract

  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
    arweave,
  });

  // Read the ArNS Registry Contract
  const contract = await warp
    .contract<IOState>(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${arnsContractTxId}`, {
      validity: true,
    });

  // ~~ Read contract source and initial state files ~~
  const newLocalSourceCodeJS = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // Create the evolved source code tx
  const evolveSrcTx = await warp.createSource(
    { src: newLocalSourceCodeJS },
    wallet,
    true,
  );
  const evolveSrcTxId = await warp.saveSource(evolveSrcTx, true);
  if (evolveSrcTxId === null) {
    return 0;
  }

  // eslint-disable-next-line
  await contract.writeInteraction(
    { function: 'evolve', value: evolveSrcTxId },
    {
      disableBundling: true,
    },
  );

  // DO NOT CHANGE THIS - it's used by github actions
  console.log(evolveSrcTxId);

  return evolveSrcTxId;
})();
