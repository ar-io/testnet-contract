import * as fs from 'fs';
import path from 'path';

import { TEST_WALLET_IDS } from './utils/constants';
import {
  addFunds,
  getLocalWallet,
  setupInitialContractState,
} from './utils/helper';
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

  // inject our test wallets to the contract
  const wallets = TEST_WALLET_IDS;
  const owner = getLocalWallet(0);

  // fund them all
  await Promise.all(
    wallets.map((_, idx) => addFunds(arweave, getLocalWallet(idx))),
  );

  // create initial contract state
  const initialContractState = setupInitialContractState(wallets[0], wallets);

  console.log('Successfully created initial contract state!');

  // deploy contract to arlocal
  const { contractTxId } = await warp.deploy(
    {
      wallet: owner,
      initState: JSON.stringify(initialContractState),
      src: contractSrcJs,
    },
    true, // disable bundling
  );

  // transfer funds to the protocol balance
  await warp.pst(contractTxId).connect(owner).writeInteraction({
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

  console.log('Successfully setup ArLocal and deployed contract.');
};

function createDirectories() {
  ['./contract'].forEach((d) => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
}
