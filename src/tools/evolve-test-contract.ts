import { defaultCacheOptions, LoggerFactory, WarpFactory } from "warp-contracts";
import * as fs from "fs";
import path from "path";
import { JWKInterface } from "arweave/node/lib/wallet";
import { testKeyfile } from "../constants";

(async () => {
  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    "rNR8SmcQLefBHZ-d-oJ9jbqmQxHGB_9bjdNipmsio-s";

  LoggerFactory.INST.logLevel("error");
  
  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forTestnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true
  );

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(testKeyfile).toString()
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
