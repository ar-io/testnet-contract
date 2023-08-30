import Arweave from 'arweave';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from './constants';

/* eslint-disable no-console */
(async () => {
  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  const arweave = new Arweave({
    host: 'ar-io.dev',
    port: 443,
    protocol: 'https',
  });

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
    arweave,
  );

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsContractTxId).setEvaluationOptions({
    internalWrites: true,
    waitForConfirmation: true,
    updateCacheForEachInteraction: true,
  });

  const auctionName = 'test-auction-name';
  const { result } = await contract.viewState({
    function: 'auction',
    name: auctionName,
  });
  console.log(result);
})();
