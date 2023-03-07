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
import { deployedContracts } from "@/deployed-contracts.js";

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID version 1.7
  const arnsRegistryContractTxId = deployedContracts.contractTxId;

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel("error");

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );

  // Get the key file used
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsRegistryContractTxId);
  contract.connect(wallet);

  // ~~ Read contract source and initial state files ~~
  const newSource = fs.readFileSync(
    path.join(__dirname, '../../dist/contract.js'),
    'utf8',
  );

  // Create the evolved source code tx
  const evolveSrcTx = await warp.createSourceTx({ src: newSource }, wallet);
  const evolveSrcTxId = await warp.saveSourceTx(evolveSrcTx, true);
  if (evolveSrcTxId === null) {
    return 0;
  }

  // stick to L1's for now
  const evolveInteractionTXId = await contract.evolve(evolveSrcTxId, {
    disableBundling: true,
  });

  console.log(
    'Finished evolving the ArNS Smartweave Contract %s with TX %s. New contract id is: %s',
    arnsRegistryContractTxId,
    evolveInteractionTXId.originalTxId,
    evolveSrcTxId,
  );
})();
