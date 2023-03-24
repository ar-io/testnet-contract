import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from './constants';
import { deployedContracts } from './deployed-contracts';

(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // The lease time for purchasing the name
  const years = 1;

  // the Tier of the name purchased.  Tier 1 = 100 subdomains, Tier 2 = 1000 subdomains, Tier 3 = 10000 subdomains
  const tier = 1;

  // A short token symbol, typically with ANT- in front
  const ticker = 'ANT-PARKINGLOT';

  // A friendly name for the name of this ANT
  const name = 'Parking Lot';

  // This is the name that will be purchased in the Arweave Name System Registry
  const nameToBuy = 'parking-lot';

  // The Time To Live for this ANT to reside cached, the default and minimum is 3600 seconds
  const ttlSeconds = 3600;

  // The arweave data transaction added to the ANT that is to be proxied using the registered name
  const dataPointer = 'W5dFQhNFtrY7IGC9sPz87HGNut6OhIuLwx3NAch72DM';

  // This is the ANT Smartweave Contract Source (v0.1.6) TX ID that will be used to create the new ANT
  const antRecordContractTxId = 'PEI1efYrsX08HUwvc6y-h6TSpsNlo2r6_fWL2_GdwhY';
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // This is the production ArNS Registry Smartweave Contract
  const arnsRegistryContractTxId = deployedContracts.contractTxId;

  // Initialize Arweave
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  // check if this name exists in the registry, if not exit the script.
  const currentState = await pst.currentState();
  const currentStateString = JSON.stringify(currentState);
  const currentStateJSON = JSON.parse(currentStateString);
  if (currentStateJSON.records[nameToBuy] !== undefined) {
    console.log(
      'This name %s is already taken and is not available for purchase.  Exiting.',
      nameToBuy,
    );
    return;
  }
  // Create the initial state for ANT v0.1.6
  const initialState = {
    ticker: ticker,
    name,
    owner: walletAddress,
    controller: walletAddress,
    evolve: null,
    records: {
      '@': {
        transactionId: dataPointer,
        ttlSeconds: ttlSeconds,
      },
    },
    balances: {
      [walletAddress]: 1,
    },
  };

  // Deploy ANT Contract in order to link to the new record
  console.log(
    'Creating ANT for %s using sourceTx',
    name,
    antRecordContractTxId,
  );
  const deployedContract = await warp.deployFromSourceTx(
    {
      wallet,
      initState: JSON.stringify(initialState),
      srcTxId: antRecordContractTxId,
    },
    true,
  ); // disable bundling for L1 transactions only

  // Buy the available record in ArNS Registry v0.1.5
  console.log(
    'Buying the record, %s using the ANT %s',
    nameToBuy,
    deployedContract.contractTxId,
  );
  await pst.writeInteraction(
    {
      function: 'buyRecord',
      name: nameToBuy,
      tier,
      contractTxId: deployedContract.contractTxId,
      years,
    },
    {
      disableBundling: true,
    },
  );
  console.log('Finished purchasing the record');
})();
