import {
  defaultCacheOptions,
  LoggerFactory,
  WarpFactory,
} from "warp-contracts";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { keyfile } from "../constants";

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
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

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString()
  );

  // Read the ArNS Registry Contract
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
