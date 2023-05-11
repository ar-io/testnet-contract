import * as fs from 'fs';
import path from 'path';
import { Contract, JWKInterface, PstState } from 'warp-contracts';

import {
  ActiveTier,
  DelayedEvolveInput,
  IOState,
  ServiceTier,
} from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_INVALID_TIER_MESSAGE,
  DEFAULT_MINIMUM_ALLOWED_EVOLUTION_DELAY,
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS,
} from './utils/constants';
import {
  getCurrentBlock,
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
  mineBlocks,
} from './utils/helper';

describe('FoundationAction', () => {
  let contract: Contract<PstState>;
  let foundationMember: JWKInterface;
  let foundationMemberAddress: string;
  let srcContractId: string;
  let fees: { [x: string]: number };
  let newLocalSourceCodeJS;
  const newTier: ServiceTier = {
    fee: 100,
    settings: {
      maxUndernames: 100,
    },
  };

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
    newLocalSourceCodeJS = fs.readFileSync(
      path.join(__dirname, '../dist/contract.js'),
      'utf8',
    );
  });

  describe('valid foundation member', () => {
    let newFoundationMember1: JWKInterface;
    let newFoundationMemberAddress1: string;
    let removedMember: JWKInterface;
    let removedMemberAddress: string;
    let newTierId: string;
    let txId: string;

    beforeAll(async () => {
      foundationMember = getLocalWallet(7);
      foundationMemberAddress = await arweave.wallets.getAddress(
        foundationMember,
      );
      newFoundationMember1 = getLocalWallet(8);
      newFoundationMemberAddress1 = await arweave.wallets.getAddress(
        newFoundationMember1,
      );
      removedMember = getLocalWallet(9);
      removedMemberAddress = await arweave.wallets.getAddress(removedMember);
      contract = warp.pst(srcContractId).connect(foundationMember);
      fees = ((await contract.readState()).cachedValue.state as IOState).fees;
    });

    it('should initiate and complete add address', async () => {
      const type = 'addAddress';
      const id1 = 0;
      const id2 = 1;
      const target1 = newFoundationMemberAddress1;
      const target2 = removedMemberAddress;
      const note1 = 'Adding member 2';
      const note2 = 'Adding member 3';
      const writeInteraction1 = await contract.writeInteraction({
        function: 'foundationAction',
        type,
        value: target1,
        note: note1,
      });
      const start1 = await getCurrentBlock(arweave);
      const writeInteraction2 = await contract.writeInteraction({
        function: 'foundationAction',
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
        id: expect.any(String),
        note: note1,
        signed: [foundationMemberAddress],
        startHeight: start1,
        status: FOUNDATION_ACTION_PASSED_STATUS, // Since there is 1 signature, this should pass immediately
        value: target1,
        type,
      });
      expect(newState.foundation.actions[id2]).toEqual({
        id: expect.any(String),
        note: note2,
        signed: [foundationMemberAddress],
        startHeight: start2,
        status: FOUNDATION_ACTION_PASSED_STATUS, // Since there is 1 signature, this should pass immediately
        value: target2,
        type,
      });
    });

    it('should initiate and complete remove address', async () => {
      const type = 'removeAddress';
      const id = 2;
      const value = removedMemberAddress;
      const note = 'Removing member 2';
      const writeInteraction = await contract.writeInteraction({
        function: 'foundationAction',
        type,
        value,
        note,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id: expect.any(String),
        note,
        signed: [foundationMemberAddress],
        startHeight: start,
        status: FOUNDATION_ACTION_PASSED_STATUS, // Since there is 1 signature, this should pass immediately
        value,
        type,
      });
    });

    it('should initiate and complete set action period', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const type = 'setActionPeriod';
      const id = 3;
      const value = 5;
      const note = 'Changing action period';
      const writeInteraction = await contract.writeInteraction({
        function: 'foundationAction',
        type,
        note,
        value,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id: expect.any(String),
        note,
        signed: [newFoundationMemberAddress1],
        startHeight: start,
        status: FOUNDATION_ACTION_PASSED_STATUS,
        type,
        value,
      });
    });

    it('should initiate and complete set min signatures', async () => {
      contract = warp.pst(srcContractId).connect(newFoundationMember1);
      const type = 'setMinSignatures';
      const id = 4;
      const value = 2;
      const note = 'Changing min signatures';
      const writeInteraction = await contract.writeInteraction({
        function: 'foundationAction',
        type,
        note,
        value,
      });
      const start = await getCurrentBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.foundation.actions[id]).toEqual({
        id: expect.any(String),
        note,
        signed: [newFoundationMemberAddress1],
        startHeight: start,
        status: FOUNDATION_ACTION_PASSED_STATUS,
        type,
        value,
      });
    });

    describe('setting name fees', () => {
      let nameFeeActionId: string;

      it.each([
        // Invalid IDs
        'not a number',
        5.8,
        0,
      ])(
        'should not approve and complete foundation action if an invalid ID is provided %s',
        async (id) => {
          contract = warp.pst(srcContractId).connect(newFoundationMember1); // a second member is required to complete the action
          const writeInteraction = await contract.writeInteraction({
            function: 'foundationAction',
            id: id,
          });

          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          expect(Object.keys(cachedValue.errorMessages)).toContain(
            writeInteraction!.originalTxId,
          );
        },
      );

      it.each([
        // TODO: other invalid fees
        'not a number',
        35.8,
        0,
        undefined,
      ])('should not be able to set invalid fee: %s', async (fee) => {
        const type = 'setNameFees';
        const note = 'Bad fees';
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
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
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining('Invalid'));
      });

      it.each([
        // TODO: other invalid fees
        'not real fees',
        0,
        {
          ...fees,
          '33': 5,
        },
        {
          ...fees,
          '0': 5,
        },
        {
          ...fees,
          10: 5,
        },
        {
          ...fees,
          '32': '500',
        },
        {
          ...fees,
          '32': -10,
        },
        {
          '32': 1000000000000000000000000000000000000000000000,
        },
      ])(
        'should not be able to set an invalid number of fees',
        async (fees) => {
          const type = 'setNameFees';
          const note = 'Bad fees';
          const writeInteraction = await contract.writeInteraction({
            function: 'foundationAction',
            type,
            note,
            value: fees,
          });

          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          expect(Object.keys(cachedValue.errorMessages)).toContain(
            writeInteraction!.originalTxId,
          );
          expect(
            cachedValue.errorMessages[writeInteraction!.originalTxId],
          ).toEqual(expect.stringContaining('Invalid'));
        },
      );

      it('should initiate set name fees', async () => {
        contract = warp.pst(srcContractId).connect(foundationMember);
        const type = 'setNameFees';
        const id = 5;
        const note = 'Modifying fees';
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          type,
          note,
          value: {
            ...fees,
            '32': 5,
          },
        });
        const start = await getCurrentBlock(arweave);
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        nameFeeActionId = writeInteraction!.originalTxId;
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[id]).toEqual({
          id: nameFeeActionId,
          note,
          signed: [foundationMemberAddress],
          startHeight: start,
          status: FOUNDATION_ACTION_ACTIVE_STATUS,
          type,
          value: {
            ...fees,
            '32': 5,
          },
        });
      });

      it('should approve and complete set name fees', async () => {
        contract = warp.pst(srcContractId).connect(newFoundationMember1); // a second member is required to complete the action
        const index = 5;
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          id: nameFeeActionId,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_ACTION_PASSED_STATUS,
        );
        expect(newState.fees).toEqual({
          ...fees,
          '32': 5,
        });
      });
    });

    describe('setting tiers', () => {
      let newTierActionId: string;
      let activeTierActionId: string;

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
          function: 'foundationAction',
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
          function: 'foundationAction',
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

      it('should initiate create new tier', async () => {
        contract = warp.pst(srcContractId).connect(foundationMember);
        const type = 'createNewTier';
        const id = 6;
        const note = 'Creating new tier';
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          type,
          note,
          value: newTier,
        });
        const start = await getCurrentBlock(arweave);
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        newTierActionId = writeInteraction!.originalTxId;
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[id]).toEqual({
          id: newTierActionId,
          note,
          signed: [foundationMemberAddress],
          startHeight: start,
          status: FOUNDATION_ACTION_ACTIVE_STATUS,
          type,
          value: expect.any(Object),
        });
        newTierId = writeInteraction!.originalTxId;
      });

      it('should approve and complete create new tier', async () => {
        contract = warp.pst(srcContractId).connect(newFoundationMember1);
        const index = 6;
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          id: newTierActionId,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_ACTION_PASSED_STATUS,
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
          function: 'foundationAction',
          type,
          note,
          value,
        });
        const start = await getCurrentBlock(arweave);
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        activeTierActionId = writeInteraction!.originalTxId;
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[id]).toEqual({
          id: activeTierActionId,
          note,
          signed: [foundationMemberAddress],
          startHeight: start,
          status: FOUNDATION_ACTION_ACTIVE_STATUS,
          type,
          value: expect.any(Object),
        });
      });

      it('should approve and complete set active tier', async () => {
        contract = warp.pst(srcContractId).connect(newFoundationMember1);
        const index = 7;
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          id: activeTierActionId,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_ACTION_PASSED_STATUS,
        );
        expect(newState.tiers.current[2]).toEqual(newTierId);
      });
    });

    describe('evolution', () => {
      let evolveActionId: string;

      it('should initiate delayed contract evolution', async () => {
        contract = warp.pst(srcContractId).connect(foundationMember);
        const type = 'delayedEvolve';
        const id = 8;
        const note = 'Evolving this contract!';
        const evolveSrcTx = await warp.createSource(
          { src: newLocalSourceCodeJS },
          foundationMember,
        );
        const evolveSrcTxId = await warp.saveSource(evolveSrcTx);
        const value: DelayedEvolveInput = {
          contractSrcTxId: evolveSrcTxId,
          evolveHeight:
            (await getCurrentBlock(arweave)) +
            DEFAULT_MINIMUM_ALLOWED_EVOLUTION_DELAY,
        };
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          type,
          note,
          value,
        });
        const start = await getCurrentBlock(arweave);
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        evolveActionId = writeInteraction!.originalTxId;
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[id]).toEqual({
          id: evolveActionId,
          note,
          signed: [foundationMemberAddress],
          startHeight: start,
          status: FOUNDATION_ACTION_ACTIVE_STATUS,
          type,
          value: expect.any(Object),
        });
      });

      it('should not complete contract evolution if it is not fully approved', async () => {
        contract = warp.pst(srcContractId).connect(newFoundationMember1);
        const { cachedValue: cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        const index = 8;
        const value = evolveActionId;
        const evolveInteraction = await contract.evolve(value, {
          disableBundling: true,
        });

        expect(evolveInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.evolve).toEqual(state.evolve);
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_ACTION_ACTIVE_STATUS,
        );
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          evolveInteraction!.originalTxId,
        );
      });

      it('should not approve delayed contract evolution if not valid foundation member', async () => {
        contract = warp.pst(srcContractId).connect(removedMember);
        const index = 8;
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          id: evolveActionId,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_ACTION_ACTIVE_STATUS,
        );
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
      });

      it('should approve delayed contract evolution', async () => {
        contract = warp.pst(srcContractId).connect(newFoundationMember1);
        const index = 8;
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          id: evolveActionId,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_ACTION_PASSED_STATUS,
        );
      });

      it('should complete contract evolution and set new source code', async () => {
        contract = warp.pst(srcContractId).connect(newFoundationMember1);
        const { cachedValue: cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        const index = 8;
        const value = evolveActionId;
        const evolveInteraction = await contract.evolve(value, {
          disableBundling: true,
        });

        expect(evolveInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.evolve).toEqual(
          (newState.foundation.actions[index].value as DelayedEvolveInput)
            .contractSrcTxId,
        );
        expect(newState.evolve).not.toEqual(state.evolve);
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          evolveInteraction!.originalTxId,
        );
        expect(newState.foundation.actions[index].status).toEqual(
          FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS,
        );
      });
    });

    describe('other test cases', () => {
      let otherActionId: string;

      it('should initiate an action which then fails if no signatures obtained within action period', async () => {
        contract = warp.pst(srcContractId).connect(foundationMember);
        const type = 'setMinSignatures';
        const id = 9;
        const value = 1;
        const note = 'Bad idea, dont agree to this!';
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          type,
          note,
          value,
        });
        const start = await getCurrentBlock(arweave);
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        otherActionId = writeInteraction!.originalTxId;
        const { cachedValue: cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(state.foundation.actions[id]).toEqual({
          id: otherActionId,
          note,
          signed: [foundationMemberAddress],
          startHeight: start,
          status: FOUNDATION_ACTION_ACTIVE_STATUS,
          type,
          value,
        });
        await mineBlocks(arweave, state.foundation.actionPeriod);
        contract = warp.pst(srcContractId).connect(newFoundationMember1);
        const writeInteraction2 = await contract.writeInteraction({
          function: 'foundationAction',
          id: otherActionId,
        });
        expect(writeInteraction2?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(newState.foundation.actions[id].status).toEqual(
          FOUNDATION_ACTION_FAILED_STATUS,
        );
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
      });
    });

    describe('write interactions', () => {
      it('should not initiate add address if not foundation member', async () => {
        const { cachedValue: cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        const type = 'addAddress';
        const target = nonFoundationMemberAddress;
        const note = 'Sneaky add';
        const writeInteraction = await contract.writeInteraction({
          function: 'foundationAction',
          type,
          value: target,
          note: note,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.foundation.actions.length).toEqual(
          newState.foundation.actions.length,
        );
      });
    });
  });
});
