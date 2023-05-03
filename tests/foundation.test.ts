import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState, ServiceTier } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
  DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
} from './utils/constants';
import {
  getCurrentBlock,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';

describe('Foundation', () => {
  let contract: Contract<PstState>;
  let foundationMember: JWKInterface;
  let foundationMemberAddress: string;
  let srcContractId: string;
  let fees: { [x: string]: number };

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid foundation member', () => {
    let newFoundationMember1: JWKInterface;
    let newFoundationMemberAddress1: string;
    let removedMember2: JWKInterface;
    let removedMemberAddress: string;

    beforeAll(async () => {
      foundationMember = getLocalWallet(7);
      foundationMemberAddress = await arweave.wallets.getAddress(
        foundationMember,
      );
      newFoundationMember1 = getLocalWallet(8);
      newFoundationMemberAddress1 = await arweave.wallets.getAddress(
        newFoundationMember1,
      );
      removedMember2 = getLocalWallet(9);
      removedMemberAddress = await arweave.wallets.getAddress(removedMember2);
      contract = warp.pst(srcContractId).connect(foundationMember);
      fees = ((await contract.readState()).cachedValue.state as IOState).fees;
    });

    it('should initiate add address', async () => {
      const type = 'addAddress';
      const id1 = 0;
      const id2 = 1;
      const target1 = newFoundationMemberAddress1;
      const target2 = removedMemberAddress;
      const note1 = 'Adding member 2';
      const note2 = 'Adding member 3';
      const writeInteraction1 = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        value: target1,
        note: note1,
      });
      const start1 = await getCurrentBlock(arweave);
      const writeInteraction2 = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        value: target2,
        note: note2,
      });
      const start2 = await getCurrentBlock(arweave);
      expect(writeInteraction1?.originalTxId).not.toBe(undefined);
      expect(writeInteraction2?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id1]).toEqual({
        id: id1,
        note: note1,
        signed: [foundationMemberAddress],
        start: start1,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        value: target1,
        type,
      });
      expect(newState.foundation.actions[id2]).toEqual({
        id: id2,
        note: note2,
        signed: [foundationMemberAddress],
        start: start2,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        value: target2,
        type,
      });
    });

    it('should approve and complete foundation add address', async () => {
      const id1 = 0;
      const id2 = 1;
      const target1 = newFoundationMemberAddress1;
      const target2 = removedMemberAddress;
      const writeInteraction1 = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id1,
      });
      const writeInteraction2 = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id2,
      });
      expect(writeInteraction1?.originalTxId).not.toBe(undefined);
      expect(writeInteraction2?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id1].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
      expect(newState.foundation.addresses).toContain(target1);
      expect(newState.foundation.addresses).toContain(target2);
    });

    it('should initiate remove address', async () => {
      const type = 'removeAddress';
      const id = 2;
      const value = removedMemberAddress;
      const note = 'Removing member 2';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        value,
        note,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id,
        note,
        signed: [foundationMemberAddress],
        start: start,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        value,
        type,
      });
    });

    it('should approve and complete foundation remove address', async () => {
      const id = 2;
      const target = removedMemberAddress;
      const writeInteraction = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
      expect(newState.foundation.addresses).not.toContain(target);
    });

    it('should initiate set action period', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const type = 'setActionPeriod';
      const id = 3;
      const value = 2;
      const note = 'Changing action period';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id,
        note,
        signed: [newFoundationMemberAddress1],
        start: start,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        type,
        value,
      });
    });

    it('should approve and complete foundation set action period', async () => {
      const id = 3;
      const target = removedMemberAddress;
      const writeInteraction = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
      expect(newState.foundation.addresses).not.toContain(target);
    });

    it('should initiate set min signatures', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const type = 'setMinSignatures';
      const id = 4;
      const value = 2;
      const note = 'Changing min signatures';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id,
        note,
        signed: [newFoundationMemberAddress1],
        start: start,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        type,
        value,
      });
    });

    it('should approve and complete foundation set min signatures', async () => {
      const id = 4;
      const writeInteraction = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
      expect(newState.foundation.actionPeriod).toEqual(2);
    });

    it('should initiate set name fees', async () => {
      contract = warp.pst(srcContractId).connect(foundationMember);
      const type = 'setNameFees';
      const id = 5;
      const note = 'Modifying fees';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value: {
          ...fees,
          '32': 5,
        },
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id,
        note,
        signed: [foundationMemberAddress],
        start: start,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        type,
        value: {
          ...fees,
          '32': 5,
        },
      });
    });

    it('should approve and complete set name fees', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const id = 5;
      const writeInteraction = await contract.writeInteraction({
        function: 'signFoundationAction',
        id: id,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id].status).toEqual(
        DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
      );
      expect(newState.fees).toEqual({
        ...fees,
        '32': 5,
      });
    });

    it.each([
      // TODO: other invalid fees
      'not a number',
      35.8,
      0,
    ])('should not be able to set invalid fee: %s', async (fee) => {
      const type = 'setNameFees';
      const note = 'Bad fees';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value: {
          ...fees,
          '32': fee,
        },
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining('Invalid'),
      );
    });

    it('should not be able to set an invalid number of fees', async () => {
      const type = 'setNameFees';
      const note = 'Bad fees';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value: {
          ...fees,
          '33': 5,
        },
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining('Invalid'),
      );
    });

    it('should initiate createNewTier', async () => {
      contract = warp.pst(srcContractId).connect(foundationMember);
      const type = 'createNewTier';
      const id = 6;
      const note = 'Creating new tier';
      const value: ServiceTier = {
        fee: 100,
        settings: {
          maxUndernames: 100,
        },
      };
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);

      const { cachedValue: newCachedValue } = await contract.readState();
      console.log(newCachedValue.errorMessages);
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id,
        note,
        signed: [foundationMemberAddress],
        start: start,
        status: DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
        type,
        value: expect.any(Object),
      });
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

    //describe('write interactions', () => {});
  });
});
