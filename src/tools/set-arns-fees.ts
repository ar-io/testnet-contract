import Arweave from "arweave";
import { LoggerFactory, WarpNodeFactory } from "warp-contracts";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { keyfile } from "../constants";

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId = "Ydv5pDoM6NBY1hySaWiRbe_2L3aeDDoLB7QNIu4BZpw";

  const feesToChange = {
    "1": 5000000000,
    "2": 1406250000,
    "3": 468750000,
    "4": 156250000,
    "5": 62500000,
    "6": 25000000,
    "7": 10000000,
    "8": 5000000,
    "9": 1000000,
    "10": 500000,
    "11": 450000,
    "12": 400000,
    "13": 350000,
    "14": 300000,
    "15": 250000,
    "16": 200000,
    "17": 175000,
    "18": 150000,
    "19": 125000,
    "20": 100000,
    "21": 100000,
    "22": 100000,
    "23": 100000,
    "24": 100000,
    "25": 100000,
    "26": 100000,
    "27": 100000,
    "28": 100000,
    "29": 100000,
    "30": 100000,
    "31": 100000,
    "32": 100000
};

  // Initialize Arweave
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel("error");

  // Initialize SmartWeave
  const smartweave = WarpNodeFactory.memCached(arweave);

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString()
  );

  // Read the ANT Registry Contract
  const pst = smartweave.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  const feesTxId = await pst.writeInteraction({
    function: "setFees",
    fees: feesToChange
  });

  console.log("Finished settings the ArNS fees: %s", feesTxId);
})();
