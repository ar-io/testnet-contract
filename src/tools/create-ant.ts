import Arweave from 'arweave';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from '../constants';

(async () => {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~UPDATE THE BELOW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // A short token symbol, typically with ANT- in front
  const ticker = 'ANT-Example';

  // A friendly name for the name of this token
  const name = 'Example';

  // The Time To Live for this ANT to reside cached, the default and minimum is 3600 seconds
  const ttlSeconds = 3600;

  // The arweave data transaction that is to be proxied using the registered name
  const dataPointer = 'zHpMN6UyTSSIo6WqER2527LvEvMKLlAcr3UR6ljd32Q';


  // This is the ANT Smartweave Contract Source (v0.1.6) TX ID that will be used to create the new ANT
  const antRecordContractTxId = 'PEI1efYrsX08HUwvc6y-h6TSpsNlo2r6_fWL2_GdwhY';
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // ~~ Initialize Arweave ~~
  const arweave = Arweave.init({
    host: 'arweave.net',
    timeout: 600000,
    port: 443,
    protocol: 'https',
  });

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );
  // ~~ Generate Wallet and add funds ~~
  // const wallet = await arweave.wallets.generate();
  // const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

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

  // ~~ Deploy contract ~~
  console.log('Creating ANT for %s', name);
  const contractTxId = await warp.deployFromSourceTx({
    wallet,
    initState: JSON.stringify(initialState),
    srcTxId: antRecordContractTxId,
  }, true); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log('Mainnet Contract id %s', contractTxId);
})();
