import Arweave from 'arweave';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

/* eslint-disable no-console */
(async () => {
  // load state of contract
  const arnsContractTxId =
    process.env.ARNS_CONTRACT_TX_ID ??
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

  LoggerFactory.INST.logLevel('error');

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
  const contract = warp.pst(arnsContractTxId);

  const auctionName = 'test-auction-name';
  const { result } = await contract.viewState({
    function: 'auction',
    name: auctionName,
  });
  console.log(result);
})();
