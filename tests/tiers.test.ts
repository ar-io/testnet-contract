import { Contract, JWKInterface, PstContract, PstState } from 'warp-contracts';

import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_INVALID_TIER_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
} from '../src/constants';
import { IOState, ServiceTier } from '../src/contracts/types/types';
import { arweave, warp } from './setup.jest';
import {
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
} from './utils/helper';

describe('Tiers', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;
    let newTierId: string;

    beforeAll(() => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to create a new tier', async () => {
      const newTier: ServiceTier = {
        fee: 100,
        settings: {
          maxUndernames: 100,
          minTTLSeconds: 1000,
        },
      };
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'createNewTier',
          newTier,
        },
        {
          disableBundling: true,
        },
      );
      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.tiers.history).toContainEqual({
        id: writeInteraction?.originalTxId,
        ...newTier,
      });
      newTierId = writeInteraction!.originalTxId;
    });

    it('should be able to set active tier to new tier id', async () => {
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'setActiveTier',
          tierId: newTierId,
          tierNumber: 2,
        },
        {
          disableBundling: true,
        },
      );
      await mineBlock(arweave);
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(newState.tiers.current[2]).toEqual(newTierId);
    });

    it('should not able to set active tier to an invalid tier number', async () => {
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      const tierId = state.tiers.current[1];
      const originalTierId = state.tiers.current[2];
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'setActiveTier',
          tierId,
          tierNumber: 5,
        },
        {
          disableBundling: true,
        },
      );
      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      const errors = newCachedValue.errorMessages;
      expect(errors[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_INVALID_TIER_MESSAGE,
      );
      expect(newState.tiers.current[2]).toEqual(originalTierId);
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeEach(() => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
    });

    it('should not be able to create a new tier', async () => {
      const newTier: ServiceTier = {
        fee: 100,
        settings: {
          maxUndernames: 100,
          minTTLSeconds: 1000,
        },
      };
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'createNewTier',
          newTier,
        },
        {
          disableBundling: true,
        },
      );
      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      const errors = newCachedValue.errorMessages;
      expect(errors[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
      );
      expect(newState.tiers.history).not.toContainEqual({
        id: writeInteraction?.originalTxId,
        ...newTier,
      });
    });

    it('should not be able to set active tiers', async () => {
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      const tierId = state.tiers.current[1];
      const originalTierId = state.tiers.current[2];
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'setActiveTier',
          tierId,
          tierNumber: 2,
        },
        {
          disableBundling: true,
        },
      );
      await mineBlock(arweave);

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      const errors = newCachedValue.errorMessages;
      expect(errors[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
      );
      expect(newState.tiers.current[2]).toEqual(originalTierId);
    });

    it('should be able to upgrade to a valid tier', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'upgradeTier',
        name: 'name1',
        tierNumber: 3,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      const state = cachedValue.state as IOState;
      const record = state.records['name1'];
      expect(record.tier).toEqual(state.tiers.current[3]);
    });

    it('should not be able to downgrade to a valid tier', async () => {
      const writeInteraction = await contract.writeInteraction({
        function: 'upgradeTier',
        name: 'name1',
        tierNumber: 2,
      });
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        DEFAULT_INVALID_TIER_MESSAGE,
      );
      const state = cachedValue.state as IOState;
      const record = state.records['name1'];
      expect(record.tier).toEqual(state.tiers.current[3]);
    });
  });

  describe('no wallet', () => {
    it('should be able to get a tier via viewState', async () => {
      const { result: tier } = await contract.viewState({
        function: 'getTier',
        tierNumber: 1,
      });
      expect(tier).not.toBe(undefined);
      expect(tier).toEqual(
        expect.objectContaining({
          fee: expect.any(Number),
          id: expect.any(String),
          settings: expect.any(Object),
        }),
      );
    });

    it('should be able to get active tiers via viewState', async () => {
      const { result: activeTiers } = await contract.viewState({
        function: 'getActiveTiers',
      });
      const expectedTierObj = expect.objectContaining({
        tier: expect.any(String),
        fee: expect.any(Number),
        id: expect.any(String),
        settings: expect.any(Object),
      });
      expect(activeTiers).not.toBe(undefined);
      expect(activeTiers).toEqual(
        expect.arrayContaining(
          ALLOWED_ACTIVE_TIERS.map((_) => expectedTierObj),
        ),
      );
    });
  });
});
