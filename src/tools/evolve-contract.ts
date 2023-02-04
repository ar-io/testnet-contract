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
  // This is the mainnet ArNS Registry Smartweave Contract TX ID version 1.7
  const arnsRegistryContractTxId =
    "R-DRqVv97e8cCya95qsH_Tpvmb9vidURYWlBL5LpSzo";

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

  const evolveSrcTx = await warp.createSourceTx({ src: newSource }, wallet);
  const evolveSrcTxId = await warp.saveSourceTx(evolveSrcTx);
  if (evolveSrcTxId === null) {
    return 0;
  }
  const evolveTx = await pst.writeInteraction({
    function: "evolve",
    value: evolveSrcTxId,
  });

  console.log(
    "Finished evolving the ArNS Smartweave Contract %s with TX %s.",
    arnsRegistryContractTxId,
    evolveTx.originalTxId
  );
})();
