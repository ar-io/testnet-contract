import { LoggerFactory, WarpFactory } from 'warp-contracts';

/* eslint-disable no-console */
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

  console.log(JSON.stringify(state, null, 2));
})();
