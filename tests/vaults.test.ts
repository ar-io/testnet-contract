import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MAX_TOKEN_LOCK_LENGTH,
  MIN_TOKEN_LOCK_LENGTH,
  TRANSFER_QTY,
} from './utils/constants';
import {
  getCurrentBlock,
  getLocalArNSContractKey,
  getLocalWallet,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Vaults', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;
  let owner: JWKInterface;
  let ownerAddress: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
    owner = getLocalWallet(0);
    ownerAddress = await arweave.wallets.getAddress(owner);
    contract = warp.pst(srcContractId).connect(owner);
  });

  describe('createVault', () => {
    it('should be able to create new vault', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'createVault',
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      const currentBlock = (await getCurrentBlock(arweave)).valueOf();
      const expectedVault = {
        balance: TRANSFER_QTY,
        start: currentBlock,
        end: currentBlock + MIN_TOKEN_LOCK_LENGTH,
      };

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
        newState.vaults[ownerAddress][writeInteraction!.originalTxId],
      ).toEqual(expectedVault);
    });

    it('should be able to create a second new vault', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const currentBlock = (await getCurrentBlock(arweave)).valueOf();
      const expectedVault = {
        balance: TRANSFER_QTY,
        start: currentBlock + 1,
        end: currentBlock + MIN_TOKEN_LOCK_LENGTH + 1,
      };
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
      expect(
        newState.vaults[ownerAddress][writeInteraction!.originalTxId],
      ).toEqual(expectedVault);
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
      const writeInteraction = await contract.writeInteraction({
        function: 'createVault',
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const existingVaultId = Object.keys(prevState.vaults[ownerAddress])[0];
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const writeInteraction2 = await contract.writeInteraction({
        function: 'extendVault',
        id: existingVaultId,
        extendLength: MIN_TOKEN_LOCK_LENGTH,
      });
      expect(writeInteraction2?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
        writeInteraction2!.originalTxId,
      );

      expect(newState.vaults[ownerAddress][existingVaultId].end).toEqual(
        prevState.vaults[ownerAddress][existingVaultId].end +
          MIN_TOKEN_LOCK_LENGTH,
      );
    });

    it.each([undefined, -1, 'bad lock length', MAX_TOKEN_LOCK_LENGTH])(
      'should not be able to extend vault with an invalid lock length',
      async (badLockLength) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const existingVaultId = Object.keys(prevState.vaults[ownerAddress])[0];
        const writeInteraction = await contract.writeInteraction({
          function: 'extendVault',
          id: existingVaultId,
          extendLength: badLockLength,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      },
    );

    it.each([undefined, -1, 'bad index', 10])(
      'should not be able to extend vault with an invalid id',
      async (badId) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'extendVault',
          id: badId,
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

  describe('increaseVault', () => {
    it('should be able to increase vault', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const existingVaultId = Object.keys(prevState.vaults[ownerAddress])[0];
      const writeInteraction = await contract.writeInteraction({
        function: 'increaseVault',
        qty: TRANSFER_QTY,
        id: existingVaultId,
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
      expect(newState.vaults[ownerAddress][existingVaultId].balance).toEqual(
        prevState.vaults[ownerAddress][existingVaultId].balance + TRANSFER_QTY,
      );
    });

    it.each([undefined, -1, 'bad qty'])(
      'should not be able to increase a vault with an invalid qty',
      async (badQty) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const existingVaultId = Object.keys(prevState.vaults[ownerAddress])[0];
        const writeInteraction = await contract.writeInteraction({
          function: 'increaseVault',
          qty: badQty,
          index: existingVaultId,
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
      const prevState = prevCachedValue.state as IOState;
      const existingVaultId = Object.keys(prevState.vaults[ownerAddress])[0];
      const writeInteraction = await contract.writeInteraction({
        function: 'increaseVault',
        qty: Math.pow(TRANSFER_QTY, 10),
        id: existingVaultId,
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
      async (badId) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'increaseVault',
          id: badId,
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

  describe('vaultedTransfer', () => {
    it('should be able to transfer tokens locked to an existing wallet', async () => {
      const existingWallet = getLocalWallet(1);
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const prevTargetBalance = prevState.balances[targetAddress];
      const writeInteraction = await contract.writeInteraction({
        function: 'vaultedTransfer',
        target: targetAddress,
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      const currentBlock = (await getCurrentBlock(arweave)).valueOf();
      const expectedVault = {
        balance: TRANSFER_QTY,
        start: currentBlock,
        end: currentBlock + MIN_TOKEN_LOCK_LENGTH,
      };

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
      expect(
        newState.vaults[targetAddress][writeInteraction.originalTxId],
      ).toEqual(expectedVault);
    });

    it('should be able to transfer tokens locked to the protocol balance', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const prevTargetBalance = prevState.balances[srcContractId] ?? 0;

      const writeInteraction = await contract.writeInteraction({
        function: 'vaultedTransfer',
        target: srcContractId, // The smartweave contract id acts as the protocol balance
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      const currentBlock = (await getCurrentBlock(arweave)).valueOf();
      const expectedVault = {
        balance: TRANSFER_QTY,
        start: currentBlock,
        end: currentBlock + MIN_TOKEN_LOCK_LENGTH,
      };

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
      expect(
        newState.vaults[srcContractId][writeInteraction!.originalTxId],
      ).toEqual(expectedVault);
    });

    it('should not be able to vaultedTransfer more tokens than a wallets balance', async () => {
      const existingWallet = getLocalWallet(1);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const targetAddress = await arweave.wallets.getAddress(existingWallet);
      const writeInteraction = await contract.writeInteraction({
        function: 'vaultedTransfer',
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
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress] ?? 0;
      const writeInteraction = await contract.writeInteraction({
        function: 'vaultedTransfer',
        target: ownerAddress,
        qty: TRANSFER_QTY,
        lockLength: MIN_TOKEN_LOCK_LENGTH,
      });

      const currentBlock = (await getCurrentBlock(arweave)).valueOf();
      const expectedVault = {
        balance: TRANSFER_QTY,
        start: currentBlock,
        end: currentBlock + MIN_TOKEN_LOCK_LENGTH,
      };

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
        newState.vaults[ownerAddress][writeInteraction!.originalTxId],
      ).toEqual(expectedVault);
    });

    it.each([undefined, 'bad-wallet-address', 100])(
      'should not be able to transfer tokens locked to an invalid wallet address',
      async (badWallet) => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'vaultedTransfer',
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
          function: 'vaultedTransfer',
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
