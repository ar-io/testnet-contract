import Arweave from "arweave";
import { LoggerFactory, WarpNodeFactory } from "warp-contracts";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { deployedContracts } from "../deployed-contracts";
import { keyfile } from "../constants";

(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The recipient target of the token transfer
  const target = "Hh6uQILbcMIFyHaEuqfO47f8VQcx_7eFzlmnRyCrGXI";

  // The amount of tokens to be transferred
  const qty = 500_000_000;
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the production ArNS Registry Smartweave Contract
  const arnsRegistryContractTxId = deployedContracts.contractTxId;

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
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // Read the ANT Registry Contract
  console.log(
    "Transfering %s tokens from %s to %s",
    qty,
    walletAddress,
    target
  );
  const pst = smartweave.pst(arnsRegistryContractTxId);
  pst.connect(wallet);
  await pst.transfer({
    target,
    qty,
  });

  console.log("Finished transferring tokens");
})();
