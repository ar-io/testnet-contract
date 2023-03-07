import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { RESERVED_ATOMIC_TX_ID, keyfile } from '../constants';

(async () => {
  // the name to buy
  const domainName = 'atomic-ant-10';
  // arns registry contract
  const ARNS_REGISTRY_ADDRESS = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';
  // source code tx for ANT (must be in approved list)
  const ANT_SOURCE_CODE_TX_ID = 'PEI1efYrsX08HUwvc6y-h6TSpsNlo2r6_fWL2_GdwhY';
  // pointer for @ ant record
  const ANT_PRIMARY_POINTER_TX_ID = '';
  // ant name
  const ANT_NAME = 'Atomic ANT';
  // ant ticker
  const ANT_TICKER = 'ANT';

  // Initialize Arweave
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
    },
    true,
  );

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  const initialState = {
    name: ANT_NAME,
    owner: walletAddress,
    evolve: null,
    ticker: ANT_TICKER,
    records: {
      '@': {
        ttlSeconds: 3600,
        transactionId: ANT_PRIMARY_POINTER_TX_ID,
      },
    },
    balances: {
      walletAddress: 1,
    },
    controller: walletAddress,
  };

  const { contractTxId, srcTxId } = await warp.deployFromSourceTx(
    {
      wallet,
      initState: JSON.stringify(initialState),
      srcTxId: ANT_SOURCE_CODE_TX_ID,
      tags: [
        {
          name: 'App-Name',
          value: 'SmartWeaveAction',
        },
        {
          name: 'Contract',
          value: ARNS_REGISTRY_ADDRESS,
        },
        {
          name: 'Input',
          value: JSON.stringify({
            function: 'buyRecord',
            name: domainName,
            contractTxId: RESERVED_ATOMIC_TX_ID,
            years: 1,
            tier: 1,
          }),
        },
      ],
    },
    true,
  );

  console.log(
    'Successfully submitted atomic ANT creation and name purchase TX id: ',
    contractTxId,
  );
})();
