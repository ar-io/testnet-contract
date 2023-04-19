import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import { DEFAULT_NETWORK_JOIN_STATUS } from './utils/constants';
import { getLocalArNSContractId, getLocalWallet } from './utils/helper';

describe('Transfers', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid gateway operator', () => {
    let owner: JWKInterface;
    let newGatewayOperator: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      newGatewayOperator = getLocalWallet(2);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should join the network with correct parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevBalance =
        prevCachedValue.state.balances[newGatewayOperatorAddress];
      const qty = prevState.settings.minNetworkJoinStakeAmount; // must meet the minimum
      const label = 'Test Gateway'; // friendly label
      const fqdn = 'jest.io';
      const port = 3000;
      const protocol = 'http';
      const openDelegation = true;
      const note =
        'Our gateway is the best test gateway. Contact bob@ar.io for more.';
      contract.connect(newGatewayOperator); // only owns a vaulted balance
      const writeInteraction = await contract.writeInteraction({
        function: 'joinNetwork',
        qty,
        label,
        fqdn,
        port,
        protocol,
        openDelegation,
        note,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.balances[newGatewayOperatorAddress]).toEqual(
        prevBalance - qty,
      );
      expect(newState.gateways[newGatewayOperatorAddress]).toEqual({
        operatorStake: qty,
        delegatedStake: 0,
        status: DEFAULT_NETWORK_JOIN_STATUS,
        vaults: [
          {
            balance: qty, // Positive integer, the amount locked
            start: 2, // At what block the lock starts.
            end: 0, // At what block the lock ends.  0 means no end date.}]
          },
        ],
        delegates: {},
        settings: {
          label: label,
          fqdn: fqdn,
          port: port,
          protocol: protocol,
          openDelegation: openDelegation,
          delegateAllowList: [],
          note: note,
        },
      });
    });

    it('should increase operator stake with correct parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevBalance = prevState.balances[newGatewayOperatorAddress];
      const prevGatewayOperatorBalance =
        prevState.gateways[newGatewayOperatorAddress].operatorStake;
      const qty = prevState.settings.minDelegatedStakeAmount; // must meet the minimum
      const writeInteraction = await contract.writeInteraction({
        function: 'increaseOperatorStake',
        qty,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.balances[newGatewayOperatorAddress]).toEqual(
        prevBalance - qty,
      );
      expect(
        newState.gateways[newGatewayOperatorAddress].operatorStake,
      ).toEqual(prevGatewayOperatorBalance + qty);
      expect(newState.gateways[newGatewayOperatorAddress].vaults[1]).toEqual({
        balance: qty, // Positive integer, the amount locked
        start: 3, // At what block the lock starts.
        end: 0, // At what block the lock ends.  0 means no end date.}]
      });
    });

    it('should initiate operator stake decrease with correct parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const id = 1; // the vault that is being unlocked
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateOperatorStakeDecrease',
        id,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(
        newState.gateways[newGatewayOperatorAddress].vaults[1].end,
      ).toEqual(
        prevState.gateways[newGatewayOperatorAddress].vaults[1].end +
          newState.settings.operatorStakeWithdrawLength,
      );
    });

    // it('should modify gateway settings', async () => {});
    // it('should not decrease stake below the network minimum', async () => {});
    // it('should initiate leaving the network with correct parameters', async () => {});
  });
});
