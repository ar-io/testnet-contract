import { getContractManifest, initialize, warp } from './utilities';

/* eslint-disable no-console */
(async () => {
  // simple setup script
  initialize();

  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId,
  });

  // Read the ArNS Registry Contract
  const contract = warp
    .pst(contractTxId)
    .setEvaluationOptions(evaluationOptions);
  const state = await contract.readState();

  console.log(JSON.stringify(state, null, 2));
})();
