import Arweave from "arweave";
import { LoggerFactory, SmartWeaveNodeFactory } from "redstone-smartweave";
import { ArNSState } from "../contracts/types/types";
import * as fs from "fs";
import path from "path";
import { keyfile } from "../constants";

const TOKENS_TO_CREATE = 10000000000000; // ten trillion tokens

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
  const smartweave = SmartWeaveNodeFactory.memCached(arweave);

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
    records: {
      "vilenarios": "K6AmqvbFSiNKJkfauWt68Qg8ISwwM-3wT_8wcryuS6U",
      "arweave": "QhibGoR1ATcT7XbqXze6qyPFheTqwCrcy_xOwiS2-Hg",
      "black-fox": "UlCk6RVxkRnmce6ON5PDcYMXpdfOHe1fjUoWAFWdUiQ",
      "dreams": "lXQnhpzNXN0vthWm3sZwE2z7E_d3EWALe5lZPruCOD4",
      "genesis": "HyUUifKMxKAwD9H01xdlQLRzNrd9NuXwuShwz2qPbT0",
      "test": "egVAfiJkJKwKOD7smeScq3K7lpS4mfWWN0sHcqDTgeg"
    },
    balances: {
      "31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8": 1000000000000,
      "QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ": 8979981250000,
      "kks7s-kx6lPdZzl6NSYZQDB76NNFBgmGN5EDZ874fYQ": 10000000000,
      "vLRHFqCw1uHu75xqB4fCDW-QxpkpJxBtFD9g4QYUbfw": 10000000000
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
