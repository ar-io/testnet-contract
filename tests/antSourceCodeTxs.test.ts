import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/contracts/types/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_ANT_CONTRACT_ID,
  DEFAULT_EXISTING_ANT_SOURCE_CODE_TX_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
} from './utils/constants';
import {
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
} from './utils/helper';

describe('ANT Source Code Transactions Ids', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;

    beforeAll(() => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to add to ant source code tx ids', async () => {
      const RANDOM_ANT_CONTRACT_ID = DEFAULT_ANT_CONTRACT_ID.replace('b', 'c');
      const writeInteraction = await contract.writeInteraction({
        function: 'addANTSourceCodeTx',
        contractTxId: RANDOM_ANT_CONTRACT_ID,
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(state.approvedANTSourceCodeTxs).toContain(RANDOM_ANT_CONTRACT_ID);
    });

    it('should not be able to add to ant source code tx ids that already exists', async () => {
      const RANDOM_ANT_CONTRACT_ID = DEFAULT_ANT_CONTRACT_ID.replace('b', 'c');
      const writeInteraction = await contract.writeInteraction({
        function: 'addANTSourceCodeTx',
        contractTxId: RANDOM_ANT_CONTRACT_ID,
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_EXISTING_ANT_SOURCE_CODE_TX_MESSAGE,
      );
    });

    it('should be able to remove an ant source code tx', async () => {
      const RANDOM_ANT_CONTRACT_ID = DEFAULT_ANT_CONTRACT_ID.replace('b', 'c');
      const writeInteraction = await contract.writeInteraction({
        function: 'removeANTSourceCodeTx',
        contractTxId: RANDOM_ANT_CONTRACT_ID,
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(state.approvedANTSourceCodeTxs).not.toContain(
        RANDOM_ANT_CONTRACT_ID,
      );
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeAll(() => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
    });

    it('should not be able to add to ant source code tx ids', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'addANTSourceCodeTx',
        contractTxId: DEFAULT_ANT_CONTRACT_ID,
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
      );
    });

    it('should not be able to remove to ant source code tx', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'removeANTSourceCodeTx',
        contractTxId: DEFAULT_ANT_CONTRACT_ID,
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
      );
    });
  });
});
