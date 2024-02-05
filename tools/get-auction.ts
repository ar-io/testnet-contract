import { IOState } from '../src/types';
import { getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // the name of the auction to get
  const auctionName = 'test-auction-name';

  // load state of contract
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId,
  });

  // Read the ArNS Registry Contract
  const contract = await warp
    .contract<IOState>(contractTxId)
    .setEvaluationOptions(evaluationOptions)
    .syncState(`https://api.arns.app/v1/contract/${contractTxId}`, {
      validity: true,
    });

  const { result } = await contract.viewState({
    function: 'auction',
    name: auctionName,
  });
  console.log(result);
})();
