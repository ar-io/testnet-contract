import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from './constants';

(async () => {

  // This is the mainnet ArNS Registry Smartweave Contract TX ID version 1.7
  const arnsRegistryContractTxId =
    'Jh3fDY501MbVYmGc2oRhRZtXPA0XCxTxONcSv5MsCgw';

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
    },
    true,
  );

  // Get the key file used
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // Read the ArNS Registry Contract
  const contract = warp.pst(arnsRegistryContractTxId)
  contract.connect(wallet);

  // Create the evolved source code tx
  const value = await contract.writeInteraction({
    function: 'updateState',
    state: {
        settings: {
            auctions: {
                current: 'f3ebbf46-a5f4-4f89-86ed-aaae4346db2a',
                history: [
                    {
                        id: 'f3ebbf46-a5f4-4f89-86ed-aaae4346db2a',
                        floorPriceMultiplier: 1, // if we ever want to drop prices
                        startPriceMultiplier: 200, // multiplier
                        auctionDuration: 5040, // approximately 1 week
                        decayRate: 0.02, // decay 2% every interval
                        decayInterval: 30 // decay every 30 blocks (~1 hour)
                    }
                ]
            }
        }
    },
  },
  {
    disableBundling: true
  });

  console.log(value)
})();
