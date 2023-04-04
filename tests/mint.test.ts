import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_INVALID_QTY_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
  DEFAULT_TRANSFER_QTY,
} from './utils/constants';
import { getLocalArNSContractId, getLocalWallet } from './utils/helper';

describe('Mint', () => {
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

    it('should be able to mint new tokens', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const mintInteraction = await contract.writeInteraction({
        function: 'mint',
        qty: DEFAULT_TRANSFER_QTY,
      });
      expect(mintInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        mintInteraction!.originalTxId,
      );
      expect(state.balances[ownerAddress]).toEqual(
        prevOwnerBalance + DEFAULT_TRANSFER_QTY,
      );
    });

    it('should be able to mint invalid quantity of tokens', async () => {
      const ownerAddress = await arweave.wallets.getAddress(owner);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevOwnerBalance = prevState.balances[ownerAddress];
      const mintInteraction = await contract.writeInteraction({
        function: 'mint',
        qty: 0,
      });
      expect(mintInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        mintInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[mintInteraction!.originalTxId]).toEqual(
        DEFAULT_INVALID_QTY_MESSAGE,
      );
      expect(state.balances[ownerAddress]).toEqual(prevOwnerBalance);
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
    });

    it('should not be able to mint new tokens', async () => {
      const nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevNonOwnerBalance = prevState.balances[nonContractOwnerAddress];
      const mintInteraction = await contract.writeInteraction({
        function: 'mint',
        qty: DEFAULT_TRANSFER_QTY,
      });
      expect(mintInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        mintInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[mintInteraction!.originalTxId]).toEqual(
        DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
      );
      expect(state.balances[nonContractOwnerAddress]).toEqual(
        prevNonOwnerBalance,
      );
    });
  });
});
