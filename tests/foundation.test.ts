import { Service } from 'ts-node';
import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { ActiveTier, IOState, ServiceTier } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_FOUNDATION_ACTION_ACTIVE_STATUS,
  DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
  DEFAULT_INVALID_TIER_MESSAGE,
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
  let newTier: ServiceTier = {
    fee: 100,
    settings: {
      maxUndernames: 100,
    },
  };

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid foundation member', () => {
    let newFoundationMember1: JWKInterface;
    let newFoundationMemberAddress1: string;
    let removedMember2: JWKInterface;
    let removedMemberAddress: string;
    let newTierId: string;

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
        status: DEFAULT_FOUNDATION_ACTION_PASSED_STATUS, // Since there is 1 signature, this should pass immediately
        value: target1,
        type,
      });
      expect(newState.foundation.actions[id2]).toEqual({
        id: id2,
        note: note2,
        signed: [foundationMemberAddress],
        start: start2,
        status: DEFAULT_FOUNDATION_ACTION_PASSED_STATUS, // Since there is 1 signature, this should pass immediately
        value: target2,
        type,
      });
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
        status: DEFAULT_FOUNDATION_ACTION_PASSED_STATUS, // Since there is 1 signature, this should pass immediately
        value,
        type,
      });
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
        status: DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
        type,
        value,
      });
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
        status: DEFAULT_FOUNDATION_ACTION_PASSED_STATUS,
        type,
        value,
      });
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
      contract = warp.pst(srcContractId).connect(newFoundationMember1); // a second member is required to complete the action
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

    it('should initiate create new tier', async () => {
      contract = warp.pst(srcContractId).connect(foundationMember);
      const type = 'createNewTier';
      const id = 6;
      const note = 'Creating new tier';
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value: newTier,
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
        value: expect.any(Object),
      });
      newTierId = writeInteraction!.originalTxId;
    });

    it('should approve and complete create new tier', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const id = 6;
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
      expect(newState.tiers.history[3]).toEqual({
        id: newTierId,
        ...newTier,
      });
    });

    it('should initiate set active tier', async () => {
      contract = warp.pst(srcContractId).connect(foundationMember);
      const type = 'setActiveTier';
      const id = 7;
      const note = 'Setting active tier';
      const tierNumber = 2;
      const value: ActiveTier = {
        tierId: newTierId,
        tierNumber,
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

    it('should approve and complete set active tier', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const id = 7;
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
      expect(newState.tiers.current[2]).toEqual(newTierId);
    });

    it('should not able to set active tier to an invalid tier number', async () => {
      contract = warp.pst(srcContractId).connect(foundationMember);
      const type = 'setActiveTier';
      const note = 'Setting bad active tier number';
      const tierNumber = 5;
      const value: ActiveTier = {
        tierId: newTierId,
        tierNumber,
      };
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      const originalTierId = state.tiers.current[2];
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      const errors = newCachedValue.errorMessages;
      expect(errors[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_INVALID_TIER_MESSAGE,
      );
      expect(newState.foundation.actions.length).toEqual(
        state.foundation.actions.length,
      );
    });

    it('should not able to set active tier to an invalid tier id', async () => {
      contract = warp.pst(srcContractId).connect(foundationMember);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      const type = 'setActiveTier';
      const note = 'Setting bad active tier id';
      const value: ActiveTier = {
        tierId: 'a-bad-tier-id',
        tierNumber: 4,
      };
      const writeInteraction = await contract.writeInteraction({
        function: 'initiateFoundationAction',
        type,
        note,
        value,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      const errors = newCachedValue.errorMessages;
      expect(errors[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_INVALID_TIER_MESSAGE,
      );
      expect(newState.foundation.actions.length).toEqual(
        state.foundation.actions.length,
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
      });
    });

    //describe('write interactions', () => {});
  });
});
