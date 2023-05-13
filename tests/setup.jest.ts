import ArLocal from 'arlocal';
import Arweave from 'arweave';
import * as fs from 'fs';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { LoggerFactory, WarpFactory } from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import {
  createLocalWallet,
  mineBlock,
  setupInitialContractState,
} from './utils/helper';

// Arlocal
export const arlocal = new ArLocal(1820, false);
// Arweave
export const arweave = Arweave.init({
  host: 'localhost',
  port: 1820,
  protocol: 'http',
});
// Warp
export const warp = WarpFactory.forLocal(1820, arweave).use(new DeployPlugin());
LoggerFactory.INST.logLevel('none');

// start arlocal
console.log('Setting up Warp, Arlocal and Arweave clients!');

jest.setTimeout(100000);
beforeAll(async () => {
  await arlocal.start();

  await mkdir(path.join(__dirname, './wallets'));
  await mkdir(path.join(__dirname, './contract'));

  // pull source code
  const contractSrcJs = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // create owner wallet
  const wallets = [
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave), // starting foundation member
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
    await createLocalWallet(arweave),
  ];
  const [owner] = wallets;

  // save wallets to disk
  wallets.forEach((w, index) => {
    fs.writeFileSync(
      path.join(__dirname, `./wallets/${index}.json`),
      JSON.stringify(w.wallet),
    );
  });

  // // create initial contract
  const initialContractState = await setupInitialContractState(
    owner.address,
    wallets.map((w) => w.address),
  );

  // deploy contract to arlocal
  const { contractTxId } = await warp.deploy(
    {
      wallet: owner.wallet,
      initState: JSON.stringify(initialContractState),
      src: contractSrcJs,
    },
    true, // disable bundling
  );

  // write contract id to file
  fs.writeFileSync(
    path.join(__dirname, `./contract/arns_contract.json`),
    JSON.stringify({
      initialContractState,
      id: contractTxId,
    }),
  );

  // // mine everything
  await mineBlock(arweave);

  console.log('Successfully setup ArLocal and deployed contract.');
});

afterAll(async () => {
  await arlocal.stop();
  await rm(path.join(__dirname, '/wallets'), { recursive: true });
  await rm(path.join(__dirname, '/contract'), { recursive: true });
});
