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

describe('TransferLocked', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
  });

  describe('contract owner', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to transfer tokens locked to an existing wallet', async () => {
      const existingWallet = getLocalWallet(1);
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'transferLocked',
        target: targetAddress,
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
      expect(newState.vaults[targetAddress][0].balance).toEqual(TRANSFER_QTY);
    });

    it('should be able to transfer tokens locked to the protocol balance', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const prevTargetBalance = prevState.balances[srcContractId] ?? 0;
      const writeInteraction = await contract.writeInteraction({
        function: 'transferLocked',
        target: srcContractId, // The smartweave contract id acts as the protocol balance
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
      expect(newState.balances[srcContractId]).toEqual(prevTargetBalance);
      expect(newState.vaults[srcContractId][0].balance).toEqual(TRANSFER_QTY);
    });

    it('should not be able to transferLocked more tokens than a wallets balance', async () => {
      const existingWallet = getLocalWallet(1);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const writeInteraction = await contract.writeInteraction({
        function: 'transferLocked',
        target: targetAddress,
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

    it('should be able to transfer tokens locked to the same wallet', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress] ?? 0;
      const writeInteraction = await contract.writeInteraction({
        function: 'transferLocked',
        target: ownerAddress,
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
      expect(
        newState.vaults[ownerAddress][newState.vaults[ownerAddress].length - 1]
          .balance,
      ).toEqual(TRANSFER_QTY);
    });

    it.each([undefined, 'bad-wallet-address', 100])(
      'should not be able to transfer tokens locked to an invalid wallet address',
      async (badWallet) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'transferLocked',
          target: badWallet,
          qty: TRANSFER_QTY,
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

    it.each([
      undefined,
      -1,
      'bad lock length',
      MIN_TOKEN_LOCK_LENGTH - 1,
      MAX_TOKEN_LOCK_LENGTH + 1,
    ])(
      'should not be able to transfer tokens locked to an invalid wallet address',
      async (badLockLength) => {
        const existingWallet = getLocalWallet(1);
        const { cachedValue: prevCachedValue } = await contract.readState();
        const targetAddress = await arweave.wallets.getAddress(existingWallet);
        const writeInteraction = await contract.writeInteraction({
          function: 'transferLocked',
          target: targetAddress,
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
  });
});