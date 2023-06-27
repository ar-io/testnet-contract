import Arweave from 'arweave';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

(async () => {
  const contractId = 'GfrHPxXyfuxNNdGvzHl_5HFX711jZsG3OE8qmG-UqlY';

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
  const contract = warp.pst(contractId).setEvaluationOptions({
    internalWrites: true,
    waitForConfirmation: true,
    updateCacheForEachInteraction: true,
  });

  const auctionName = 'test-auction-name'
  const { result } = await contract.viewState({
    function: 'auction',
    name: auctionName,
  });
  console.log(result);
})();
