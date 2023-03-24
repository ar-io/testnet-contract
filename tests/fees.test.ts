import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_INITIAL_STATE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
} from './utils/constants';
import {
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
} from './utils/helper';

describe('Fees', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;
  let fees: { [x: string]: number };

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
      fees = ((await contract.readState()).cachedValue.state as IOState).fees;
    });

    it('should be able to set new fees', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'setFees',
        fees: {
          ...fees,
          '32': 5,
        },
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(state.fees).toEqual({
        ...DEFAULT_INITIAL_STATE.fees,
        '32': 5,
      });
    });

    it.each([
      // TODO: other invalid fees
      'not a number',
      35.8,
      0,
    ])('should not be able to set invalid fee: %s', async (fee) => {
      const writeInteraction = await contract.writeInteraction({
        function: 'setFees',
        fees: {
          ...fees,
          '32': fee,
        },
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining('Invalid value for fee'),
      );
    });

    it('should not be able to set an invalid number of fees', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'setFees',
        fees: {
          ...fees,
          '33': 5,
        },
      });

      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining('Invalid number of fees being set'),
      );
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
      fees = ((await contract.readState()).cachedValue.state as IOState).fees;
    });

    it('should not be able to set fees', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'setFees',
        fees: {
          ...fees,
          '32': 5,
        },
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
