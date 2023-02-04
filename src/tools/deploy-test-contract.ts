import Arweave from "arweave";
import {
  defaultCacheOptions,
  LoggerFactory,
  WarpFactory,
} from "warp-contracts";
import * as fs from "fs";
import path from "path";
import { addFunds } from "../../utils/_helpers";
import { ArNSState } from "../contracts/types/types";
import { testKeyfile } from "../constants";

const TOKENS_TO_CREATE = 10000000000000; // ten trillion tokens

(async () => {
  // ~~ Initialize Arweave ~~
  const arweave = Arweave.init({
    host: "testnet.redstone.tools",
    timeout: 60000,
    port: 443,
    protocol: "https",
  });

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel("error");

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forTestnet({
    ...defaultCacheOptions,
    inMemory: true,
  });
  // ~~ Generate Wallet and add funds ~~
  // const wallet = await arweave.wallets.generate();
  // const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  const wallet = JSON.parse(await fs.readFileSync(testKeyfile).toString());
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  await addFunds(arweave, wallet);

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, "../../dist/contract.js"),
    "utf8"
  );
  const stateFromFile: ArNSState = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../dist/contracts/initial-state.json"),
      "utf8"
    )
  );
  const initialState: ArNSState = {
    ...stateFromFile,
    ...{
      owner: walletAddress,
    },
    balances: {
      [walletAddress]: TOKENS_TO_CREATE,
    },
  };

  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy({
    wallet,
    initState: JSON.stringify(initialState),
    src: contractSrc,
  });

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
