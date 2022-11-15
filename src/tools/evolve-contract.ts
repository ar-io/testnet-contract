import {
  defaultCacheOptions,
  LoggerFactory,
  WarpFactory,
} from "warp-contracts";
import * as fs from "fs";
import path from "path";
import { JWKInterface } from "arweave/node/lib/wallet";
// import { deployedContracts } from "../deployed-contracts";
import { keyfile } from "../constants";

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    "Ydv5pDoM6NBY1hySaWiRbe_2L3aeDDoLB7QNIu4BZpw";

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

  // Get the key file used
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString()
  );

  // Read the ArNS Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  // ~~ Read contract source and initial state files ~~
  const newSource = fs.readFileSync(
    path.join(__dirname, "../../dist/contract.js"),
    "utf8"
  );
  console.log(newSource);
  const newSrcTxId = await pst.save({ src: newSource }, warp.environment);
  if (newSrcTxId === null) {
    return 0;
  }
  console.log(newSrcTxId);
  const evolvedTxId = await pst.evolve(newSrcTxId);

  console.log("Finished evolving the ArNS Smartweave Contract %s.", newSrcTxId);
  console.log(`New Contract Tx Id ${evolvedTxId}`);
})();
