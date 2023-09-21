import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { WarpFactory, defaultCacheOptions } from 'warp-contracts';

import { keyfile } from './constants';
import { arweave, getContractManifest, warp } from './utilities';

/* eslint-disable no-console */
// This script will finalize the operator stake decrease and unlock and return the tokens to the gateway operator
// The gateway's wallet owner or any other user is authorized to finalize the operator's stake decrease
(async () => {
  // load local wallet
  const wallet: JWKInterface = JSON.parse(
    process.env.JWK ? process.env.JWK : fs.readFileSync(keyfile).toString(),
  );

  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  // wallet address
  const walletAddress = await arweave.wallets.getAddress(wallet);

  // get contract manifest
  const { evaluationOptions = {} } = await getContractManifest({
    contractTxId: arnsContractTxId,
  });

  // Read the ANT Registry Contract
  const contract = warp
    .pst(arnsContractTxId)
    .connect(wallet)
    .setEvaluationOptions(evaluationOptions);

  const writeInteraction = await contract.writeInteraction(
    {
      function: 'finalizeOperatorStakeDecrease',
    },
    {
      disableBundling: true,
    },
  );

  // eslint-disable-next-line no-console
  console.log(
    `${walletAddress} successfully submitted request to finalize leaving the network with TX id: ${writeInteraction?.originalTxId}`,
  );
})();
