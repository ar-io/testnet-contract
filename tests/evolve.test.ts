import Arweave from 'arweave';
import {
  Contract,
  JWKInterface,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { IOState } from '../src/types';
import {
  getContractManifest,
  getLocalArNSContractKey,
  getLocalWallet,
} from './utils/helper';
import { arweave as arweaveLocal, warp as warpLocal } from './utils/services';

const testnetContractTxId =
  process.env.ARNS_CONTRACT_TX_ID ??
  'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';

const arweave = new Arweave({
  host: 'ar-io.dev',
  port: 443,
  protocol: 'https',
});

const warpMainnet = WarpFactory.forMainnet(
  {
    ...defaultCacheOptions,
  },
  true,
  arweave,
).use(new DeployPlugin());

describe('evolving', () => {
  let localContractOwnerJWK: JWKInterface;
  let newForkedContract: Contract<IOState>;
  let localSourceCodeId: string;

  beforeAll(async () => {
    localSourceCodeId = getLocalArNSContractKey('srcTxId');
    localContractOwnerJWK = getLocalWallet(0);

    // get the existing contract state
    const { evaluationOptions = {} } = await getContractManifest({
      arweave,
      contractTxId: testnetContractTxId,
    });
    // fetches the currently deployed contract (on arweave.net) state against the most recent sort key
    const testnetContract = await warpMainnet
      .contract<IOState>(testnetContractTxId)
      .setEvaluationOptions(evaluationOptions)
      .syncState(`https://api.arns.app/v1/contract/${testnetContractTxId}`, {
        validity: true,
      });
    const { cachedValue } = await testnetContract.readState();

    const ownerAddress = await arweaveLocal.wallets.jwkToAddress(
      localContractOwnerJWK,
    );

    // deploy a new contract locally using the deployed (arweave.net) contracts state to test that any code changes to not break the ability to evolve forward
    const { contractTxId: newContractTxId } =
      await warpLocal.deployFromSourceTx(
        {
          wallet: localContractOwnerJWK,
          initState: JSON.stringify({
            ...(cachedValue.state as any),
            owner: ownerAddress,
            evolve: null,
          }),
          srcTxId: localSourceCodeId,
        },
        true,
      );
    newForkedContract = warpLocal
      .contract<IOState>(newContractTxId)
      .connect(localContractOwnerJWK);
  });

  // if this test fails, it means that we are going to lose our ability to evolve after the next contract update - VERY IMPORTANT to ensure this test is not modified or removed without thorough review
  it('should be able evolve a newly deployed arns contract with a forked state using the new contract source', async () => {
    const writeInteraction = await newForkedContract.evolve(localSourceCodeId);
    expect(writeInteraction?.originalTxId).not.toBeUndefined();
    const { cachedValue } = await newForkedContract.readState();
    expect(Object.keys(cachedValue.errorMessages)).not.toContain(
      writeInteraction?.originalTxId,
    );
    expect(cachedValue.state.evolve).toBe(localSourceCodeId);
  });

  // it('should be able to run evolve state on the new contract', async () => {
  //   const writeInteraction = await newForkedContract.writeInteraction({
  //     function: 'evolveState',
  //   });
  //   expect(writeInteraction?.originalTxId).not.toBeUndefined();
  //   const { cachedValue } = await newForkedContract.readState();
  //   expect(Object.keys(cachedValue.errorMessages)).not.toContain(
  //     writeInteraction?.originalTxId,
  //   );
  //   expect(cachedValue.state.evolve).toBe(localSourceCodeId);
  // });
});
