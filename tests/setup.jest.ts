import * as fs from 'fs';
import path from 'path';
import { JWKInterface } from 'warp-contracts';
import { ArweaveSigner } from 'warp-contracts-plugin-deploy';

import { TEST_WALLET_IDS } from './utils/constants';
import { getLocalWallet, setupInitialContractState } from './utils/helper';
import { arlocal, warp } from './utils/services';

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

  // inject our test wallets to the contract
  const wallets = TEST_WALLET_IDS;
  const owner = new ArweaveSigner(getLocalWallet(0));

  // create initial contract state
  const initialContractState = setupInitialContractState(wallets[0], wallets);

  console.log('Successfully created initial contract state!'); // eslint-disable-line

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

  console.log('Successfully setup ArLocal and deployed contract.'); // eslint-disable-line
};

function createDirectories() {
  ['./contract'].forEach((d) => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
}
