import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_CONTRACT_SETTINGS,
  DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
  DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
  DEFAULT_WALLET_FUND_AMOUNT,
  NETWORK_HIDDEN_STATUS,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
} from './utils/constants';
import {
  getCurrentBlock,
  getLocalArNSContractId,
  getLocalWallet,
  mineBlocks,
} from './utils/helper';

describe('Foundation', () => {
  let contract: Contract<PstState>;
  let foundationMember: JWKInterface;
  let foundationMemberAddress: string;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid foundation member', () => {
    let newFoundationMember1: JWKInterface;
    let newFoundationMemberAddress1: string;
    let newFoundationMember2: JWKInterface;
    let newFoundationMemberAddress2: string;

    beforeAll(async () => {
      foundationMember = getLocalWallet(7);
      foundationMemberAddress = await arweave.wallets.getAddress(
        foundationMember,
      );
      newFoundationMember1 = getLocalWallet(8);
      newFoundationMemberAddress1 = await arweave.wallets.getAddress(
        newFoundationMember1,
      );
      newFoundationMember2 = getLocalWallet(9);
      newFoundationMemberAddress2 = await arweave.wallets.getAddress(
        newFoundationMember2,
      );
      contract = warp.pst(srcContractId).connect(foundationMember);
    });
    it('should initiate foundation token transfer', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const type = 'transfer';
      const qty = 200;
      const target = newFoundationMemberAddress1;
      const note = 'Testing transfer';
      const prevFoundationBalance = prevState.foundation.balance;
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        target,
        qty,
        note,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.balance).toEqual(prevFoundationBalance - qty);
      expect(newState.foundation.actions[0]).toEqual({
        id: 0,
        note,
        qty,
        signed: [foundationMemberAddress],
        start: 2,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        target,
        type,
      });
    });

    it('should approve and complete foundation token transfer', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const id = 0;
      const target = newFoundationMemberAddress1;
      const prevNewMemberBalance = prevState.balances[target] || 0;
      const writeInteraction = await contract.writeInteraction({
        function: 'signFoundationAction',
        id,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      //console.log(newCachedValue.errorMessages);
      const newState = newCachedValue.state as IOState;
      expect(newState.balances[target]).toEqual(
        prevNewMemberBalance + (newState.foundation.actions[id].qty || 0),
      );
      expect(newState.foundation.actions[0].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
    });

    it('should initiate foundation token transfer locked', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const type = 'transferLocked';
      const qty = 300;
      const lockLength = 10;
      const target = newFoundationMemberAddress1;
      const note = 'Testing transfer locked';
      const prevFoundationBalance = prevState.foundation.balance;
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        target,
        qty,
        note,
      });
      const start1 = await getCurrentBlock(arweave);
      const writeInteraction2 = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        target,
        qty,
        lockLength,
        note,
      });
      const start2 = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      expect(writeInteraction2?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.balance).toEqual(
        prevFoundationBalance - qty * 2,
      );
      expect(newState.foundation.actions[1]).toEqual({
        id: 1,
        note,
        qty,
        signed: [foundationMemberAddress],
        start: start1,
        lockLength: 0, // since we did not specify a lock length, it should be set to 0,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        target,
        type,
      });
      expect(newState.foundation.actions[2]).toEqual({
        id: 2,
        note,
        qty,
        signed: [foundationMemberAddress],
        start: start2,
        lockLength,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        target,
        type,
      });
    });

    it('should approve and complete foundation token transfer locked', async () => {
      const id1 = 1;
      const id2 = 2;
      const target = newFoundationMemberAddress1;
      const writeInteraction1 = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id1,
      });
      const start1 = await getCurrentBlock(arweave);
      const writeInteraction2 = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id2,
      });
      const start2 = await getCurrentBlock(arweave);
      expect(writeInteraction1?.originalTxId).not.toBe(undefined);
      expect(writeInteraction2?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.vaults[target][0]).toEqual({
        balance: newState.foundation.actions[id1].qty,
        end: 0,
        start: start1,
      });
      expect(newState.vaults[target][1]).toEqual({
        balance: newState.foundation.actions[id1].qty,
        end: start2 + (newState.foundation.actions[id2].lockLength || 0),
        start: start2,
      });
      expect(newState.foundation.actions[id1].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
      expect(newState.foundation.actions[id2].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
    });
  });

  describe('non-valid foundation member', () => {
    let nonFoundationMember: JWKInterface;
    let nonFoundationMemberAddress: string;

    beforeAll(async () => {
      foundationMember = getLocalWallet(0);
      foundationMemberAddress = await arweave.wallets.getAddress(
        foundationMember,
      );
      nonFoundationMember = getLocalWallet(6);
      contract = warp.pst(srcContractId).connect(nonFoundationMember);
      nonFoundationMemberAddress = await arweave.wallets.getAddress(
        nonFoundationMember,
      );
    });

    describe('read interactions', () => {
      it('TODO', async () => {
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        console.log(JSON.stringify(newState.foundation, null, 5));
        console.log(JSON.stringify(newState.vaults, null, 5));
      });
    });

    describe('write interactions', () => {});
  });
});
