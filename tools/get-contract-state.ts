import * as fs from 'fs';
import { LoggerFactory, WarpFactory } from 'warp-contracts';

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const contractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('fatal');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet();

  // Read the ArNS Registry Contract
  const pst = warp.pst(contractTxId);
  const state = await pst
    .setEvaluationOptions({
      internalWrites: true,
      updateCacheForEachInteraction: true,
      unsafeClient: 'skip',
    })
    .readState();

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(state, null, 2));
})();
