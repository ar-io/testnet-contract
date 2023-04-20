import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_LEAVING_NETWORK_STATUS,
  DEFAULT_MAINTENANCE_MODE_STATUS,
  DEFAULT_NETWORK_JOIN_STATUS,
  DEFAULT_WALLET_FUND_AMOUNT,
} from './utils/constants';
import {
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
} from './utils/helper';

describe('Network', () => {
  let contract: Contract<PstState>;
  let owner: JWKInterface;
  let ownerAddress: string;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid gateway operator', () => {
    let approvedDelegate1: JWKInterface;
    let approvedDelegate2: JWKInterface;
    let newGatewayOperator: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      newGatewayOperator = getLocalWallet(5);
      approvedDelegate1 = getLocalWallet(6);
      approvedDelegate2 = getLocalWallet(7);
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
        start: 2,
        end: 0,
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

    it('should not initiate operator stake decrease if the vault has not been locked long enough', async () => {
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
      ).toEqual(0); // TO DO, make this more dynamic.  Need to fetch current block height
    });

    it('should initiate operator stake decrease with correct parameters', async () => {
      await mineBlock(arweave);
      await mineBlock(arweave);
      await mineBlock(arweave);
      await mineBlock(arweave);
      await mineBlock(arweave);
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
      ).toEqual(15); // TO DO, make this more dynamic.  Need to fetch current block height
    });

    it('should not initiate operator stake decrease if it brings the gateway below the minimum', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const id = 0; // the vault that is being unlocked
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
        newState.gateways[newGatewayOperatorAddress].vaults[0].end,
      ).toEqual(0);
    });

    it('should not finalize operator stake decrease if its end block height has not passed', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const writeInteraction = await contract.writeInteraction({
        function: 'finalizeOperatorStakeDecrease',
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.gateways[newGatewayOperatorAddress].vaults[1]).toEqual(
        prevState.gateways[newGatewayOperatorAddress].vaults[1],
      );
    });

    it('should finalize operator stake decrease if its end blockheight has passed', async () => {
      await mineBlock(arweave);
      await mineBlock(arweave);
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const writeInteraction = await contract.writeInteraction({
        function: 'finalizeOperatorStakeDecrease',
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.gateways[newGatewayOperatorAddress].vaults[1]).toEqual(
        undefined,
      );
      expect(newState.balances[newGatewayOperatorAddress]).toEqual(
        prevState.balances[newGatewayOperatorAddress] +
          prevState.gateways[newGatewayOperatorAddress].vaults[1].balance,
      );
    });

    it('should modify gateway settings with correct parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const label = 'UPDATED'; // friendly label
      const port = 443;
      const protocol = 'https';
      const note = 'UPDATED NOTE';
      const status = 'maintenanceMode';
      const openDelegation = false;
      const delegateAllowList = [
        await arweave.wallets.getAddress(approvedDelegate1),
        await arweave.wallets.getAddress(approvedDelegate2),
      ];
      const writeInteraction = await contract.writeInteraction({
        function: 'updateGatewaySettings',
        label,
        port,
        protocol,
        openDelegation,
        delegateAllowList,
        note,
        status,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.gateways[newGatewayOperatorAddress].settings).toEqual({
        label: label,
        fqdn: prevState.gateways[newGatewayOperatorAddress].settings.fqdn,
        port: port,
        protocol: protocol,
        openDelegation: openDelegation,
        delegateAllowList: delegateAllowList,
        note: note,
      });
      expect(newState.gateways[newGatewayOperatorAddress].status).toEqual(
        DEFAULT_MAINTENANCE_MODE_STATUS,
      );
    });

    it('should not modify gateway settings with invalid parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const label = 'SUUUUUUUUUUUUUUUUUUUUUUUUUUPER LONG LABEL!!!!!!!!!'; // friendly label
      const port = 'string';
      const protocol = 'ipfs';
      const fqdn = 'fake_url.com';
      const note = 12345;
      const status = 'leavingNetwork';
      const openDelegation = 'whatever';
      const delegateAllowList = ['this aint a wallet'];
      const writeInteraction = await contract.writeInteraction({
        function: 'updateGatewaySettings',
        label,
        port,
        protocol,
        fqdn,
        openDelegation,
        delegateAllowList,
        note,
        status,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.gateways[newGatewayOperatorAddress].settings).toEqual(
        prevState.gateways[newGatewayOperatorAddress].settings,
      );
      expect(newState.gateways[newGatewayOperatorAddress].status).toEqual(
        prevState.gateways[newGatewayOperatorAddress].status,
      );
    });

    it('should initiate leaving the network with correct parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateLeave',
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      for (
        let i = 0;
        i < newState.gateways[newGatewayOperatorAddress].vaults.length;
        i += 1
      ) {
        expect(
          newState.gateways[newGatewayOperatorAddress].end,
        ).toBeGreaterThan(0); // TODO, update this to be more dynamic and look for the exact end date
      }
      expect(newState.gateways[newGatewayOperatorAddress].status).toEqual(
        DEFAULT_LEAVING_NETWORK_STATUS,
      );
    });

    it('should not finalize leaving the network with correct parameters', async () => {
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const writeInteraction = await contract.writeInteraction({
        function: 'finalizeLeave',
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.gateways[newGatewayOperatorAddress]).toEqual(
        prevState.gateways[newGatewayOperatorAddress],
      );
    });

    it('should finalize leaving the network with correct parameters', async () => {
      await mineBlock(arweave);
      await mineBlock(arweave);
      await mineBlock(arweave);
      await mineBlock(arweave);
      await mineBlock(arweave);
      const newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      const writeInteraction = await contract.writeInteraction({
        function: 'finalizeLeave',
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(Object.keys(newCachedValue.errorMessages)).not.toContain([
        writeInteraction!.originalTxId,
      ]);
      expect(newState.gateways[newGatewayOperatorAddress]).toEqual(undefined);
    });
  });

  describe('non-valid gateway operator', () => {
    let nonGatewayOperator: JWKInterface;
    let nonGatewayOperatorAddress: string;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      ownerAddress = await arweave.wallets.getAddress(owner);
      nonGatewayOperator = getLocalWallet(6);
      contract = warp.pst(srcContractId).connect(nonGatewayOperator);
      nonGatewayOperatorAddress = await arweave.wallets.getAddress(
        nonGatewayOperator,
      );
    });

    describe('read interactions', () => {
      it('should be able to fetch gateway details via view state', async () => {
        const { result: gateway } = await contract.viewState({
          function: 'getGateway',
          target: ownerAddress,
        });
        const expectedGatewayObj = expect.objectContaining({
          operatorStake: expect.any(Number),
          delegatedStake: expect.any(Number),
          status: expect.any(String),
          vaults: expect.any(Array),
          delegates: expect.any(Object),
          settings: expect.any(Object),
        });
        expect(gateway).not.toBe(undefined);
        expect(gateway).toEqual(expectedGatewayObj);
      });

      it('should be return an error when fetching a non-existent gateway via viewState', async () => {
        const response = await contract.viewState({
          function: 'getGateway',
          target: 'non-existent-gateway',
        });
        expect(response).not.toBe(undefined);
        expect(response?.errorMessage).toEqual(
          'This target does not have a registered gateway.',
        );
      });

      it('should be able to fetch gateways total stake', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const { result: gatewayTotalStake } = await contract.viewState({
          function: 'getGatewayTotalStake',
          target: ownerAddress,
        });
        expect(gatewayTotalStake).toEqual(
          prevState.gateways[ownerAddress].operatorStake +
            prevState.gateways[ownerAddress].delegatedStake,
        );
      });

      it('should be able to fetch gateway address registry via view state', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const { result: gateways } = await contract.viewState({
          function: 'getGatewayRegistry',
        });
        expect(gateways).not.toBe(undefined);
        expect(gateways).toEqual(prevState.gateways);
      });

      it('should be able to fetch stake ranked, active gateway address registry via view state', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const { result: rankedGateways } = await contract.viewState({
          function: 'getRankedGatewayRegistry',
        });
        expect(rankedGateways).not.toBe(undefined); // TODO, make this more specific
      });
    });

    describe('write interactions', () => {
      it('should not join the network without correct parameters', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevBalance =
          prevCachedValue.state.balances[nonGatewayOperatorAddress];
        const qty = DEFAULT_WALLET_FUND_AMOUNT * 2; // This user should not have this much
        const label = 'Invalid Gateway'; // friendly label
        const fqdn = 'invalid.io';
        const port = 3000;
        const protocol = 'http';
        const openDelegation = true;
        const note = 'Invalid gateway';
        contract.connect(nonGatewayOperator);
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
        expect(newState.balances[nonGatewayOperatorAddress]).toEqual(
          prevBalance,
        );
        expect(newState.gateways[nonGatewayOperatorAddress]).toEqual(undefined);
      });
    });
  });
});
