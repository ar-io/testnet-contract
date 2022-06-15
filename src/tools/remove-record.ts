import Arweave from "arweave";
import { LoggerFactory, SmartWeaveNodeFactory } from "redstone-smartweave";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { deployedContracts } from "../deployed-contracts";
import { keyfile } from "../constants";

(async () => {
    //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // This is the name that will be removed from the Gateway Name System Registry
  const nameToRemove = "example";

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the production GNS Registry Smartweave Contract TX ID
  const gnsRegistryContractTxId = deployedContracts.contractTxId;

  // Initialize Arweave
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel("error");

  // Initialize SmartWeave
  const smartweave = SmartWeaveNodeFactory.memCached(arweave);

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString()
  );

  // Read the GNT Registry Contract
  const pst = smartweave.pst(gnsRegistryContractTxId);
  pst.connect(wallet);

  // Remove the record in GNS Registry
  console.log(
    "Removing the record, %s",
    nameToRemove,
  );
  const recordTxId = await pst.writeInteraction({
    function: "removeRecord",
    name: nameToRemove,
  });
  console.log("Finished removing the record: %s", recordTxId);
})();
