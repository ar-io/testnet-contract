import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import { LoggerFactory, WarpFactory } from 'warp-contracts';

import { testKeyfile } from '../constants';

(async () => {
  const qty = 10_000_000;
  // This is the testnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    'J121VPOHa9pT2QKOs2ub0bZh9LqHesubdnfwW2v126w';

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');

  // Initialize SmartWeave
  const warp = WarpFactory.forTestnet();

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(testKeyfile).toString(),
  );

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  const mintTxId = await pst.writeInteraction({
    function: 'mint',
    qty,
  });
  console.log('Finished minting %s tokens. ID: %s', qty, mintTxId);
})();
