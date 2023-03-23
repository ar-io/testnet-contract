import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';

import { keyfile } from '../constants';

(async () => {
  // This is the mainnet ArNS Registry Smartweave Contract TX ID
  const arnsRegistryContractTxId =
    'k0yfvCpbusgE7a6JrqFVmoTWWJSQV4Zte3EVoLgd8dw';

  const tierNumber = 1;
  // the id of the tier that is published to smartweave contract state
  const tierId = 'TDkipK7o5bNmw8bJpbrAxxOp75LiyLkgqEvTQpwdAJc';

  // Initialize `LoggerFactory`
  LoggerFactory.INST.logLevel('error');

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
  );

  // Get the key file used for the distribution
  const wallet: JWKInterface = JSON.parse(
    await fs.readFileSync(keyfile).toString(),
  );

  // Read the ANT Registry Contract
  const pst = warp.pst(arnsRegistryContractTxId);
  pst.connect(wallet);

  const txId = await pst.writeInteraction(
    {
      function: 'setActiveTier',
      tierId,
      tierNumber,
    },
    {
      disableBundling: true,
    },
  );

  console.log('Finished updating the active ArNS tier: %s', txId);
})();
