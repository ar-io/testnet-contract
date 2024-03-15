import { JWKInterface } from 'arweave/node/lib/wallet';
import { Tag } from 'warp-contracts';

import { arweave, initialize, loadWallet, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();
  // the name to buy
  const domainName = 'atomic-ant-10';
  // source code tx for ANT (must be in approved list)
  const ANT_SOURCE_CODE_TX_ID = 'PEI1efYrsX08HUwvc6y-h6TSpsNlo2r6_fWL2_GdwhY';
  // pointer for @ ant record
  const ANT_PRIMARY_POINTER_TX_ID = '';
  // ant name
  const ANT_NAME = 'Atomic ANT';
  // ant ticker
  const ANT_TICKER = 'ANT';

  // load local wallet
  const wallet: JWKInterface = loadWallet();

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  const initialState = {
    name: ANT_NAME,
    owner: walletAddress,
    evolve: null,
    ticker: ANT_TICKER,
    records: {
      '@': {
        transactionId: ANT_PRIMARY_POINTER_TX_ID,
      },
    },
    balances: {
      walletAddress: 1,
    },
    controller: walletAddress,
  };

  const appNameTag = new Tag('App-Name', 'SmartWeaveAction');
  const contractTag = new Tag('Contract', arnsContractTxId);
  const inputTag = new Tag(
    'Input',
    JSON.stringify({
      function: 'buyRecord',
      name: domainName,
      contractTxId: 'atomic',
    }),
  );

  const { contractTxId } = await warp.deployFromSourceTx(
    {
      wallet,
      initState: JSON.stringify(initialState),
      srcTxId: ANT_SOURCE_CODE_TX_ID,
      tags: [appNameTag, contractTag, inputTag],
    },
    true,
  );

  console.log(
    'Successfully submitted atomic ANT creation and name purchase TX id: ',
    contractTxId,
  );
})();
