import Arweave from "arweave";
import { LoggerFactory, WarpNodeFactory } from "warp-contracts";
import { ArNSState } from "../contracts/types/types";
import * as fs from "fs";
import path from "path";
import { keyfile } from "../constants";

(async () => {
  // ~~ Initialize Arweave ~~
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel("error");

  // ~~ Initialize SmartWeave ~~
  const smartweave = WarpNodeFactory.memCached(arweave);

  // Get the key file used for the distribution
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

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
    records: {},
    balances: {
      "31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8": 1000000000000,
      QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ: 8969966350000,
      "kks7s-kx6lPdZzl6NSYZQDB76NNFBgmGN5EDZ874fYQ": 10000000000,
      "vLRHFqCw1uHu75xqB4fCDW-QxpkpJxBtFD9g4QYUbfw": 9975000000,
      "vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI": 9992500000,
    },
  };

  // ~~ Deploy contract ~~
  const contractTxId = await smartweave.createContract.deploy({
    wallet,
    initState: JSON.stringify(initialState),
    src: contractSrc,
  });

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
