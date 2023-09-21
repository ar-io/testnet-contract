import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { getContractManifest, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // the name of the auction to get
  const auctionName = 'test-auction-name';

  // load state of contract
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  LoggerFactory.INST.logLevel('error');

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId,
  });

  // Read the ArNS Registry Contract
  const contract = warp
    .pst(contractTxId)
    .setEvaluationOptions(evaluationOptions);

  const { result } = await contract.viewState({
    function: 'auction',
    name: auctionName,
  });
  console.log(result);
})();
