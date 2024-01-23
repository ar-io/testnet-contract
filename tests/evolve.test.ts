import { Contract, JWKInterface, PstState } from 'warp-contracts';

import {
  arweave,
  getContractManifest,
  warp as warpMainnet,
} from '../tools/utilities';
import { getLocalArNSContractKey, getLocalWallet } from './utils/helper';
import { arweave as arweaveLocal, warp as warpLocal } from './utils/services';

const testnetContractTxId =
  process.env.ARNS_CONTRACT_TX_ID ??
  '_NctcA2sRy1-J4OmIQZbYFPM17piNcbdBPH2ncX2RL8';

describe('evolving', () => {
  let localContractOwnerJWK: JWKInterface;
  let newForkedContract: Contract<PstState>;
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
      .contract(testnetContractTxId)
      .setEvaluationOptions(evaluationOptions)
      .syncState(`https://api.arns.app/v1/contract/${testnetContractTxId}`);
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
      .pst(newContractTxId)
      .connect(localContractOwnerJWK);
  });

  // if this test fails, it means that we are going to lose our ability to evolve after the next contract update - VERY IMPORTANT to ensure this test is not modified or removed without thorough review
  it('should be able evolve a newly deployed arns contract with a forked state using the new contract source', async () => {
    const writeInteraction = await newForkedContract.evolve(localSourceCodeId);
    expect(writeInteraction.originalTxId).not.toBeUndefined();
    const { cachedValue } = await newForkedContract.readState();
    expect(Object.keys(cachedValue.errorMessages)).not.toContain(
      writeInteraction.originalTxId,
    );
    expect(cachedValue.state.evolve).toBe(localSourceCodeId);
  });
});
