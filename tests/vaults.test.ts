import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
  TRANSFER_QTY,
} from './utils/constants';
import { getLocalArNSContractKey, getLocalWallet } from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Vaults', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
  });

  describe('createVault', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to create new vault', async () => {
      const existingWallet = getLocalWallet(1);
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'createVault',
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(newState.balances[ownerAddress]).toEqual(
        prevOwnerBalance - TRANSFER_QTY,
      );
      expect(newState.balances[targetAddress]).toEqual(prevTargetBalance);
      expect(newState.vaults[ownerAddress][0].balance).toEqual(TRANSFER_QTY);
    });

    it('should be able to create a second new vault', async () => {
      const existingWallet = getLocalWallet(1);
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'createVault',
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(newState.balances[ownerAddress]).toEqual(
        prevOwnerBalance - TRANSFER_QTY,
      );
      expect(newState.balances[targetAddress]).toEqual(prevTargetBalance);
      expect(newState.vaults[ownerAddress][1].balance).toEqual(TRANSFER_QTY);
    });

    it.each([
      undefined,
      -1,
      'bad lock length',
      MIN_TOKEN_LOCK_LENGTH - 1,
      MAX_TOKEN_LOCK_LENGTH + 1,
    ])(
      'should not be able to create vault with an invalid lock length',
      async (badLockLength) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'createVault',
          qty: TRANSFER_QTY,
          lockLength: badLockLength,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newCachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );

    it.each([undefined, -1, 'bad qty'])(
      'should not be able to create vault with an invalid qty',
      async (badQty) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'createVault',
          qty: badQty,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newCachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );

    it('should not be able to create a vault with more tokens than a wallets balance', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const writeInteraction = await contract.writeInteraction({
        function: 'createVault',
        qty: Math.pow(TRANSFER_QTY, 10),
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      expect(Object.keys(newCachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(
        newCachedValue.errorMessages[writeInteraction!.originalTxId],
      ).toEqual(INSUFFICIENT_FUNDS_MESSAGE);
      expect(newCachedValue.state).toEqual(prevCachedValue.state);
    });
  });

  describe('extendVault', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to extend vault', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const writeInteraction = await contract.writeInteraction({
        function: 'createVault',
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const writeInteraction2 = await contract.writeInteraction({
        function: 'extendVault',
        index: 0,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
      expect(writeInteraction2?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction2!.originalTxId,
      );

      expect(newState.vaults[ownerAddress][0].end).toEqual(
        prevState.vaults[ownerAddress][0].end + MIN_TOKEN_LOCK_LENGTH,
      );
    });

    it.each([undefined, -1, 'bad lock length', MAX_TOKEN_LOCK_LENGTH])(
      'should not be able to extend vault with an invalid lock length',
      async (badLockLength) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'extendVault',
          index: 0,
          lockLength: badLockLength,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );

    it.each([undefined, -1, 'bad index', 3])(
      'should not be able to extend vault with an invalid index',
      async (badIndex) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'extendVault',
          index: badIndex,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );
  });

  describe('increaseVault', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to increase vault', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'increaseVault',
        qty: TRANSFER_QTY,
        index: 0,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(newState.balances[ownerAddress]).toEqual(
        prevOwnerBalance - TRANSFER_QTY,
      );
      expect(newState.vaults[ownerAddress][0].balance).toEqual(
        prevState.vaults[ownerAddress][0].balance + TRANSFER_QTY,
      );
    });

    it.each([undefined, -1, 'bad qty'])(
      'should not be able to increase a vault with an invalid qty',
      async (badQty) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'increaseVault',
          qty: badQty,
          index: 0,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newCachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );

    it('should not be able to increase a vault with more tokens than a wallets balance', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const writeInteraction = await contract.writeInteraction({
        function: 'increaseVault',
        qty: Math.pow(TRANSFER_QTY, 10),
        index: 0,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      expect(Object.keys(newCachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(newCachedValue.state).toEqual(prevCachedValue.state);
    });

    it.each([undefined, -1, 'bad index', 3])(
      'should not be able to increase vault with an invalid index',
      async (badIndex) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'increaseVault',
          index: badIndex,
          lockLength: MIN_TOKEN_LOCK_LENGTH,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newCachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );
  });
});
