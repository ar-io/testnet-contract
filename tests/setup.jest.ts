import * as fs from 'fs';
import path from 'path';
import { SourceType } from 'warp-contracts';

import { createLocalWallet, setupInitialContractState } from './utils/helper';
import { arlocal, arweave, warp } from './utils/services';

module.exports = async () => {
  // start arlocal
  console.log('\n\nSetting up Warp, Arlocal and Arweave clients...'); // eslint-disable-line

  await arlocal.start();

  createDirectories();

  // pull source code
  const contractSrcJs = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // create owner wallet
  const wallets = await Promise.all(
    Array.from({ length: 11 }).map(() => createLocalWallet(arweave)),
  );
  // save wallets to disk
  wallets.forEach((w, index) => {
    fs.writeFileSync(
      path.join(__dirname, `./wallets/${index}.json`),
      JSON.stringify(w.wallet),
    );
  });

  console.log('Successfully created wallets!'); // eslint-disable-line

  // // // create initial contract
  const initialContractState = setupInitialContractState(
    wallets[0].address,
    wallets.map((w) => w.address),
  );

  console.log('Successfully created initial contract state!'); // eslint-disable-line

  // deploy contract to arlocal
  const { contractTxId } = await warp.deploy(
    {
      wallet: wallets[0].wallet,
      initState: JSON.stringify(initialContractState),
      src: contractSrcJs,
      evaluationManifest: {
        evaluationOptions: {
          internalWrites: true,
          useKVStorage: true, // tells evaluators the key value storage is used for storing contract state
          updateCacheForEachInteraction: true, // required for internal writes - increases performance, but takes memory hit
          sourceType: SourceType.ARWEAVE,
        },
      },
    },
    true,
  ); // disable bundling

  // transfer funds to the protocol balance
  await warp.pst(contractTxId).connect(wallets[0].wallet).writeInteraction({
    function: 'transfer',
    target: contractTxId,
    qty: 1, // just a hack for now - we'll need to give it a balance
  });

  // write contract to local
  fs.writeFileSync(
    path.join(__dirname, `./contract/arns_contract.json`),
    JSON.stringify({
      initialContractState,
      id: contractTxId,
    }),
  );

  console.log('Successfully setup ArLocal and deployed contract.'); // eslint-disable-line
};

function createDirectories() {
  ['./wallets', './contract'].forEach((d) => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
}
