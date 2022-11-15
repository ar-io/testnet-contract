import Arweave from "arweave";
import { LoggerFactory, WarpFactory } from "warp-contracts";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { testKeyfile } from "../constants";

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    "iGAvbHDz0WVwc4Yh1fwKdC0iX02DWXPVXbztgvx-J58";

  // ~~ Initialize warp ~~
  LoggerFactory.INST.logLevel('error');
  const warp = WarpFactory.forTestnet();

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(testKeyfile).toString()
  );

  // Read the ARNS Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  const txId = await pst.writeInteraction({
    function: "fixState",
  });

  console.log("Finished fixing the contract: %s", txId);
})();
