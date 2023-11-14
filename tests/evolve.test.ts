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
  '3aX8Ck5_IRLA3L9o4BJLOWxJDrmLLIPoUGZxqOfmHDI';

describe('evolving contract', () => {
  let contractOwner: JWKInterface;
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('srcTxId');
    contractOwner = getLocalWallet(0);

    // get the existing contract state
    const { evaluationOptions = {} } = await getContractManifest({
      arweave,
      contractTxId: testnetContractTxId,
    });
    const testnetContract = await warpMainnet
      .contract(testnetContractTxId)
      .setEvaluationOptions(evaluationOptions)
      .syncState(`https://api.arns.app/v1/contract/${testnetContractTxId}`);
    const { cachedValue } = await testnetContract.readState();

    const ownerAddress = await arweaveLocal.wallets.jwkToAddress(contractOwner);

    // deploy a new contract locally against the existing contract state to test that evolve will not break
    const { contractTxId: newContractTxId } =
      await warpLocal.deployFromSourceTx(
        {
          wallet: contractOwner,
          initState: JSON.stringify({
            ...(cachedValue.state as any),
            owner: ownerAddress,
            evolve: null,
          }),
          srcTxId: srcContractId,
        },
        true,
      );
    contract = warpLocal.pst(newContractTxId).connect(contractOwner);
  });

  it('should be able to evolve the existing arns contract with the new contract source code', async () => {
    const writeInteraction = await contract.evolve(srcContractId);
    expect(writeInteraction.originalTxId).not.toBeUndefined();
    const { cachedValue } = await contract.readState();
    expect(Object.keys(cachedValue.errorMessages)).not.toContain(
      writeInteraction.originalTxId,
    );
    expect(cachedValue.state.evolve).toBe(srcContractId);
  });
});
