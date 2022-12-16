import {
  defaultCacheOptions,
  LoggerFactory,
  WarpFactory,
} from "warp-contracts";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { keyfile } from "../constants";
import { getCurrentBlockHeight } from "../contracts/utilities";

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U";

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
  const currentStateString = JSON.stringify(currentState, null, 5);
  const currentStateJSON = JSON.parse(currentStateString);
  console.log(currentStateJSON);

  const block = await getCurrentBlockHeight();
  const fileName = "ArNS_State_" + block.toString() + ".json";
  fs.writeFileSync(fileName, currentStateString);
  console.log(
    "Finished getting the ArNS state for the registry: %s",
    arnsRegistryContractTxId
  );
})();
