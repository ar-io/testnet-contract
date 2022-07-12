import Arweave from "arweave";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { keyfile } from "../constants";
import Verto from "@verto/js";


(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The Smartweave Contract to add to the Verto Exchange
  const tokenContractToList = "vmSTnLo58jMISCUDWtk-b2AhRXe-hPnP0RzAXdQaHtA";

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString()
  );

  const client = new Verto(
    wallet // wallet to use for interactions (for arconnect, leave it undefined or "use_wallet")
  );

  const interactionID = await client.token.list(
    tokenContractToList,
    "custom"
  );

  console.log("Finished listing token: %s", interactionID);
})();
