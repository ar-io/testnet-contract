import Arweave from "arweave";
import {
  defaultCacheOptions,
  LoggerFactory,
  WarpFactory,
} from "warp-contracts";
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
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true
  );
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
      "black-fox": "4FftM3u83NKE4taZcIO2Kd8O4IMrOcLmhuOzq9Kv1fk",
      genesis: "xEL3QuBjrJtlJm4DSHn7BKB5S-riLc1qCkmn3r-xkiE",
      sam: "JRlbzWbl9J3MDdobdIxkvfX4IC_VFCrNw5kuz_a8I6I",
      vilenarios: "XJnC9jPXpwAvrNnmeYYo69I6RrSf9MNabGDGaQws8dQ",
      wavelength: "2drG0kM9eHBA4KTEvJb1b_ngu1VcBxde-cKLpf0PVN4",
      laserilla: "vmSTnLo58jMISCUDWtk-b2AhRXe-hPnP0RzAXdQaHtA",
      almostgreat: "uFA2OlsLGJe-4BjbT8OtvH0KT6EZJQMccOVx332lMSI",
      ardrive: "dyx91X6sqb2WbJiM5jA5XfmCh0LWJjILmFN7mxTR2Fs",
      nosferatu: "da51nhDwLZaLBA3lzpE7xl36Rms2NwUNZ7SKOTEWkbI",
      permanotes: "2SMd2AcYG9RXtFkNzhCB-l1yvE9yKfA8aPztorCvWXI",
      "rakis-me": "E0Aat6fRC6pEPsCVZy1RhvmOgzc3xV0_fdu5BkSIrjo",
    },
    balances: {
      "31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8": 1000000000000,
      QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ: 8969966350000,
      "kks7s-kx6lPdZzl6NSYZQDB76NNFBgmGN5EDZ874fYQ": 10000000000,
      "vLRHFqCw1uHu75xqB4fCDW-QxpkpJxBtFD9g4QYUbfw": 9975000000,
      "vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI": 9992500000,
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
