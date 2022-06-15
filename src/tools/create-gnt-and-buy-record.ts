import Arweave from "arweave";
import { LoggerFactory, SmartWeaveNodeFactory } from "redstone-smartweave";
import * as fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import { deployedContracts } from "../deployed-contracts";
import { keyfile } from "../constants";

(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // A short token symbol, typically with GNT- in front
  const ticker = "ANT-LASERILLA";

  // A friendly name for the name of this GNT
  const name = "Laserilla";

  // This is the name that will be purchased in the Gateway Name System Registry
  const nameToBuy = "laserilla";

  // The arweave data transaction added to the GNT that is to be proxied using the registered name
  const dataPointer = "Hg89hNyRy56OnspA8hKwcpfzoE75Kh0-m_ka5SbPhu0";

  // This is the GNT Smartweave Contract Source TX ID that will be used to create the new GNT
  const gntRecordContractTxId = "cNr6JPVu3rEOwIbdnu3lVipz9pwY5Pps9mxHSW7Jdtk";
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the production GNS Registry Smartweave Contract
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
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // Read the GNT Registry Contract
  const pst = smartweave.pst(gnsRegistryContractTxId);
  pst.connect(wallet);

  // check if this name exists in the registry, if not exit the script.
  const currentState = await pst.currentState();
  const currentStateString = JSON.stringify(currentState);
  const currentStateJSON = JSON.parse(currentStateString);
  if (currentStateJSON.records[nameToBuy] !== undefined) {
    console.log("This name %s is already taken and is not available for purchase.  Exiting.", nameToBuy);
    return;
  }
  // Create the initial state
  const initialState = {
    ticker: ticker,
    name,
    owner: walletAddress,
    evolve: null,
    records: {
      ["@"]: dataPointer
    },
    balances: {
      [walletAddress]: 1,
    },
  };

  // Deploy GNT Contract in order to link to the new record
  console.log(
    "Creating GNT for %s using sourceTx",
    name,
    gntRecordContractTxId
  );
  const contractTxId = await smartweave.createContract.deployFromSourceTx({
    wallet,
    initState: JSON.stringify(initialState),
    srcTxId: gntRecordContractTxId,
  });

  // Buy the available record in GNS Registry
  console.log(
    "Buying the record, %s using the GNT %s",
    nameToBuy,
    contractTxId
  );
  await pst.writeInteraction({
    function: "buyRecord",
    name: nameToBuy,
    contractTransactionId: contractTxId,
  });
  console.log("Finished purchasing the record");
})();
