import Arweave from "arweave";
import { LoggerFactory, WarpFactory, defaultCacheOptions } from "warp-contracts";
import * as fs from "fs";
import path from "path";
import { addFunds } from "../../utils/_helpers";
import { IOState } from "../contracts/types/types";
import { testKeyfile } from "../constants";
import { JWKInterface } from "arweave/node/lib/wallet";

let wallet2: JWKInterface;
let wallet3: JWKInterface;
let wallet4: JWKInterface;
let wallet5: JWKInterface;
let gatewayWallet: JWKInterface;
let gatewayWallet2: JWKInterface;
let delegateWallet: JWKInterface;
let delegateWallet2: JWKInterface;
let slashedWallet: JWKInterface;

(async () => {
  // ~~ Initialize Arweave ~~
  const arweave = Arweave.init({
    host: 'testnet.redstone.tools',
    timeout: 60000,
    port: 443,
    protocol: 'https',
  });

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forTestnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );

  // ~~ Generate Wallet and add funds ~~
  // const wallet = await arweave.wallets.generate();
  // const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  const wallet = JSON.parse(await fs.readFileSync(testKeyfile).toString());
  await addFunds(arweave, wallet);

  wallet2 = await arweave.wallets.generate();
  await addFunds(arweave, wallet2);

  wallet3 = await arweave.wallets.generate();
  await addFunds(arweave, wallet3);

  wallet4 = await arweave.wallets.generate();
  await addFunds(arweave, wallet4);

  wallet5 = await arweave.wallets.generate();
  await addFunds(arweave, wallet5);

  gatewayWallet = await arweave.wallets.generate();
  await addFunds(arweave, gatewayWallet);

  gatewayWallet2 = await arweave.wallets.generate();
  await addFunds(arweave, gatewayWallet2);

  delegateWallet = await arweave.wallets.generate();
  await addFunds(arweave, delegateWallet);

  delegateWallet2 = await arweave.wallets.generate();
  await addFunds(arweave, delegateWallet2);

  slashedWallet = await arweave.wallets.generate();
  await addFunds(arweave, slashedWallet);

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../../dist/contract.js'),
    'utf8',
  );
  const initialState: IOState = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../dist/contracts/initial-state.json'),
      'utf8',
    ),
  );

  
  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy({
    wallet,
    initState: JSON.stringify(initialState),
    src: contractSrc,
  }, true); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
