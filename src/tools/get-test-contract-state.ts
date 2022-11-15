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

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);
  const currentState = await pst.currentState();
  const currentStateString = JSON.stringify(currentState);
  const currentStateJSON = JSON.parse(currentStateString);
  console.log(currentStateJSON);
  console.log(
    "Finished set the ArNS state for the registry: %s",
    arnsRegistryContractTxId
  );
})();
