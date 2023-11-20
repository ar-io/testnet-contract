import * as fs from 'fs';
import path from 'path';

import { WALLETS_TO_CREATE } from './utils/constants';
import { createLocalWallet, setupInitialContractState } from './utils/helper';
import { arlocal, arweave, warp } from './utils/services';

/* eslint-disable no-console */
module.exports = async () => {
  // start arlocal
  console.log('\n\nSetting up Warp, Arlocal and Arweave clients...');

  await arlocal.start();

  createDirectories();

  // pull source code
  const contractSrcJs = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // create owner wallet
  const wallets = [];
  for (let i = 0; i < WALLETS_TO_CREATE; i++) {
    wallets.push(await createLocalWallet(arweave));
  }
  // save wallets to disk
  console.log('Saving wallets to disk!');

  wallets.forEach((w, index) => {
    fs.writeFileSync(
      path.join(__dirname, `./wallets/${index}.json`),
      JSON.stringify(w.wallet),
    );
  });

  console.log('Successfully created wallets!');

  // create initial contract
  const initialContractState = await setupInitialContractState(
    wallets[0].address,
    wallets.map((w) => w.address),
  );

  console.log('Successfully created initial contract state!');

  // deploy contract to arlocal
  const { contractTxId, srcTxId } = await warp.deploy(
    {
      wallet: wallets[0].wallet,
      initState: JSON.stringify(initialContractState),
      src: contractSrcJs,
    },
    true,
  ); // disable bundling

  console.log('Successfully deployed contract!', {
    contractTxId,
    srcTxId,
  });

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
      srcTxId: srcTxId,
    }),
  );

  console.log('Successfully setup ArLocal and deployed contract.');
};

function createDirectories() {
  ['./wallets', './contract'].forEach((d) => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
}
