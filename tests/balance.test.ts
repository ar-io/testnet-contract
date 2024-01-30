import { Contract, JWKInterface } from 'warp-contracts';

import { IOState } from '../src/types';
import { getLocalArNSContractKey, getLocalWallet } from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Balance', () => {
  let contract: Contract<IOState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp
        .contract<IOState>(srcContractId)
        .connect(nonContractOwner);
    });

    it('should able to retrieve its own balance', async () => {
      const nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevNonOwnerBalance = prevState.balances[nonContractOwnerAddress];
      const { result } = (await contract.viewState({
        function: 'balance',
        target: nonContractOwnerAddress,
      })) as any;
      expect(result).not.toBe(undefined);
      expect(result.target).toEqual(nonContractOwnerAddress);
      expect(result.balance).toEqual(prevNonOwnerBalance);
    });

    it('should able to retrieve another wallets balance', async () => {
      const otherWallet = getLocalWallet(2);
      const otherWalletAddress = await arweave.wallets.getAddress(otherWallet);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevNonOwnerBalance = prevState.balances[otherWalletAddress];
      const { result } = (await contract.viewState({
        function: 'balance',
        target: otherWalletAddress,
      })) as any;
      expect(result).not.toBe(undefined);
      expect(result.target).toEqual(otherWalletAddress);
      expect(result.balance).toEqual(prevNonOwnerBalance);
    });
  });
});
