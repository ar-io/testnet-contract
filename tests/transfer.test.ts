import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_INSUFFICIENT_FUNDS_MESSAGE,
  DEFAULT_INVALID_TARGET_MESSAGE,
  DEFAULT_TRANSFER_QTY,
} from './utils/constants';
import {
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';

describe('Transfers', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to transfer tokens to existing wallet', async () => {
      const existingWallet = getLocalWallet(1);
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'transfer',
        target: targetAddress,
        qty: DEFAULT_TRANSFER_QTY,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(newState.balances[ownerAddress]).toEqual(
        prevOwnerBalance - DEFAULT_TRANSFER_QTY,
      );
      expect(newState.balances[targetAddress]).toEqual(
        prevTargetBalance + DEFAULT_TRANSFER_QTY,
      );
    });

    it('should not be able to transfer more than wallet balance', async () => {
      const existingWallet = getLocalWallet(1);
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'transfer',
        target: targetAddress,
        qty: Math.pow(DEFAULT_TRANSFER_QTY, 10),
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(
        newCachedValue.errorMessages[writeInteraction!.originalTxId],
      ).toEqual(DEFAULT_INSUFFICIENT_FUNDS_MESSAGE);
      expect(newState.balances[ownerAddress]).toEqual(prevOwnerBalance);
      expect(newState.balances[targetAddress]).toEqual(prevTargetBalance);
    });

    it('should not be able to transfer to the same wallet', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'transfer',
        target: ownerAddress,
        qty: DEFAULT_TRANSFER_QTY,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(
        newCachedValue.errorMessages[writeInteraction!.originalTxId],
      ).toEqual(DEFAULT_INVALID_TARGET_MESSAGE);
      expect(newState.balances[ownerAddress]).toEqual(prevOwnerBalance);
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
    });

    it('should be able to transfer tokens to existing wallet', async () => {
      const existingWallet = getLocalWallet(0);
      const callerAddress = await arweave.wallets.getAddress(nonContractOwner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[callerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'transfer',
        target: targetAddress,
        qty: DEFAULT_TRANSFER_QTY,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(newState.balances[callerAddress]).toEqual(
        prevOwnerBalance - DEFAULT_TRANSFER_QTY,
      );
      expect(newState.balances[targetAddress]).toEqual(
        prevTargetBalance + DEFAULT_TRANSFER_QTY,
      );
    });

    it('should not be able to transfer to the same wallet', async () => {
      const callerAddress = await arweave.wallets.getAddress(nonContractOwner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[callerAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'transfer',
        target: callerAddress,
        qty: DEFAULT_TRANSFER_QTY,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(
        newCachedValue.errorMessages[writeInteraction!.originalTxId],
      ).toEqual(DEFAULT_INVALID_TARGET_MESSAGE);
      expect(newState.balances[callerAddress]).toEqual(prevOwnerBalance);
    });
  });
});
