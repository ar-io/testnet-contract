import Arweave from "arweave";
import { LoggerFactory, SmartWeaveNodeFactory } from "redstone-smartweave";
import * as fs from "fs";
import path from "path";
import { JWKInterface } from "arweave/node/lib/wallet";
import { deployedTestContracts } from "../deployed-contracts";
import { testKeyfile } from "../constants";

(async () => {
  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId = deployedTestContracts.contractTxId;

  // Initialize Arweave
  const arweave = Arweave.init({
    host: "testnet.redstone.tools",
    port: 443,
    protocol: "https",
  });

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel("error");

  // Initialize SmartWeave
  const smartweave = SmartWeaveNodeFactory.memCached(arweave);

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(testKeyfile).toString()
  );

  // Read the ANT Registry Contract
  const pst = smartweave.pst(arnsRegistryContractTxId);
  console.log ("yep")
  pst.connect(wallet);

  /*const newSource = fs.readFileSync(path.join(__dirname, '/contract_evolve.js'), 'utf8');
  const newSrcTxId = await pst.saveNewSource(newSource);
  await pst.evolve(newSrcTxId);*/
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  
  console.log ((await pst.currentState()).balances[walletAddress]);

  //console.log("Finished evolving the Test ArNS Smartweave Contract %s.", newSrcTxId);
})();
