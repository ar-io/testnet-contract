import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { ArNSNamePurchase, IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  ALLOWED_ACTIVE_TIERS,
  DEFAULT_ANT_CONTRACT_ID,
  DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  DEFAULT_INVALID_ARNS_NAME_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
} from './utils/constants';
import {
  calculateTotalRegistrationFee,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';

describe('Records', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;
    let ownerAddress: string;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
      ownerAddress = await arweave.wallets.getAddress(owner);
    });

    describe('write interactions', () => {
      it('should be able to buy a record with tierNumber specified', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[ownerAddress];
        const namePurchase: ArNSNamePurchase = {
          name: 'ownersNewRecord',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );

        const purchasedTierId =
          prevState.tiers.current[namePurchase.tierNumber!];
        const purchasedTier = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId,
        )!;
        const expectedPurchasePrice = calculateTotalRegistrationFee(
          namePurchase.name,
          prevState,
          purchasedTier,
          namePurchase.years,
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.balances[ownerAddress]).toEqual(
          prevBalance - expectedPurchasePrice,
        );
      });

      it('should be able to buy a reserved record that is past end date', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[ownerAddress];
        const namePurchase: ArNSNamePurchase = {
          name: 'twitter',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );

        await mineBlock(arweave);

        const purchasedTierId =
          prevState.tiers.current[namePurchase.tierNumber!];
        const purchasedTier = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId,
        )!;
        const expectedPurchasePrice = calculateTotalRegistrationFee(
          namePurchase.name,
          prevState,
          purchasedTier,
          namePurchase.years,
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.balances[ownerAddress]).toEqual(
          prevBalance - expectedPurchasePrice,
        );
      });

      it('should be able to buy a reserved record that is owned by the caller', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[ownerAddress];
        const namePurchase: ArNSNamePurchase = {
          name: 'disney', // this has no expiration but the caller can purchase it.
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );
        const namePurchase2: ArNSNamePurchase = {
          name: 'microsoft', // this name hasnt expired yet but the caller can purchase it
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction2 = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase2,
          },
          {
            disableBundling: true,
          },
        );

        await mineBlock(arweave);

        const purchasedTierId =
          prevState.tiers.current[namePurchase.tierNumber!];
        const purchasedTier = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId,
        )!;
        const purchasedTierId2 =
          prevState.tiers.current[namePurchase2.tierNumber!];
        const purchasedTier2 = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId2,
        )!;
        const expectedPurchasePrice = calculateTotalRegistrationFee(
          namePurchase.name,
          prevState,
          purchasedTier,
          namePurchase.years,
        );
        const expectedPurchasePrice2 = calculateTotalRegistrationFee(
          namePurchase2.name,
          prevState,
          purchasedTier2,
          namePurchase2.years,
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        expect(writeInteraction2?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.records[namePurchase2.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.balances[ownerAddress]).toEqual(
          prevBalance - (expectedPurchasePrice + expectedPurchasePrice2),
        );
      });

      it('should be able to buy a record without a tierNumber specified', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[ownerAddress];
        const namePurchase: ArNSNamePurchase = {
          name: 'ownersNewRecord2',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );

        const purchasedTierId =
          prevState.tiers.current[ALLOWED_ACTIVE_TIERS[0]];
        const purchasedTier = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId,
        )!;
        const expectedPurchasePrice = calculateTotalRegistrationFee(
          namePurchase.name,
          prevState,
          purchasedTier,
          namePurchase.years,
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.balances[ownerAddress]).toEqual(
          prevBalance - expectedPurchasePrice,
        );
      });

      it('should not be able to buy a record with a reserved name specified', async () => {
        const reservedNamePurchase1: ArNSNamePurchase = {
          name: '1', // this short name is not owned by anyone and has no expiration
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...reservedNamePurchase1,
          },
          {
            disableBundling: true,
          },
        );
        const reservedNamePurchase2 = {
          name: 'www', // this short name is not owned by anyone and has no expiration
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction2 = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...reservedNamePurchase2,
          },
          {
            disableBundling: true,
          },
        );
        const reservedNamePurchase3 = {
          name: 'google', // this name is not owned by anyone and is not expired yet
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction3 = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...reservedNamePurchase3,
          },
          {
            disableBundling: true,
          },
        );
        const reservedNamePurchase4 = {
          name: 'tesla', // this name is not owned by the calling wallet so it should not purchase
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction4 = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...reservedNamePurchase4,
          },
          {
            disableBundling: true,
          },
        );

        await mineBlock(arweave);
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        expect(writeInteraction2?.originalTxId).not.toBe(undefined);
        expect(writeInteraction3?.originalTxId).not.toBe(undefined);
        expect(writeInteraction4?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(state.records[reservedNamePurchase1.name.toLowerCase()]).toEqual(
          undefined,
        );
        expect(state.records[reservedNamePurchase2.name.toLowerCase()]).toEqual(
          undefined,
        );
        expect(state.records[reservedNamePurchase3.name.toLowerCase()]).toEqual(
          undefined,
        );
        expect(state.records[reservedNamePurchase4.name.toLowerCase()]).toEqual(
          undefined,
        );
      });

      it('should be able to remove a record', async () => {
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'removeRecord',
            name: 'ownersNewRecord',
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;

        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records['ownersNewRecord']).toBe(undefined);
      });

      it('should not be able to remove record that does not exist', async () => {
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'removeRecord',
            name: 'nonexistent-record',
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
      });
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;
    let nonContractOwnerAddress: string;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
      nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
    });

    describe('read interactions', () => {
      it('should be able to fetch record details via view state', async () => {
        const { result: record } = await contract.viewState({
          function: 'getRecord',
          name: 'name1',
        });
        const expectedTierObj = expect.objectContaining({
          fee: expect.any(Number),
          id: expect.any(String),
          settings: expect.any(Object),
        });
        const expectObjected = expect.objectContaining({
          tier: expectedTierObj,
          name: 'name1',
          endTimestamp: expect.any(Number),
          contractTxID: expect.any(String),
        });
        expect(record).not.toBe(undefined);
        expect(record).toEqual(expectObjected);
      });

      it('should be return an error when fetching a non-existent record via viewState', async () => {
        const response = await contract.viewState({
          function: 'getRecord',
          name: 'non-existent-name',
        });
        expect(response).not.toBe(undefined);
        expect(response?.errorMessage).toEqual('This name does not exist');
      });
    });

    describe('write interactions', () => {
      it('should be able to purchase a name', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[nonContractOwnerAddress];
        const namePurchase: ArNSNamePurchase = {
          name: 'newName',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );

        const purchasedTierId =
          prevState.tiers.current[namePurchase.tierNumber!];
        const purchasedTier = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId,
        )!;
        const expectedPurchasePrice = calculateTotalRegistrationFee(
          namePurchase.name,
          prevState,
          purchasedTier,
          namePurchase.years,
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.balances[nonContractOwnerAddress]).toEqual(
          prevBalance - expectedPurchasePrice,
        );
      });

      it('should be able to purchase a name without specifying years or tier', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[nonContractOwnerAddress];
        const namePurchase: Partial<ArNSNamePurchase> = {
          name: 'newName2',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );

        const purchasedTierId = prevState.tiers.current[1];
        const purchasedTier = prevState.tiers.history.find(
          (t) => t.id === purchasedTierId,
        )!;
        const expectedPurchasePrice = calculateTotalRegistrationFee(
          namePurchase.name!,
          prevState,
          purchasedTier,
          1,
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records[namePurchase.name!.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[1],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(state.balances[nonContractOwnerAddress]).toEqual(
          prevBalance - expectedPurchasePrice,
        );
      });

      it('should not be able to purchase a name that has not expired', async () => {
        const namePurchase: ArNSNamePurchase = {
          name: 'newName',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'buyRecord',
            ...namePurchase,
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
      });

      it.each([
        // TODO: add other known invalid names
        '',
        '*&*##$%#',
        '-leading',
        'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
        'test.subdomain.name',
      ])(
        'should not be able to purchase an invalid name: %s',
        async (badName) => {
          const namePurchase: ArNSNamePurchase = {
            name: badName,
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            years: 1,
            tierNumber: 1,
          };
          const writeInteraction = await contract.writeInteraction(
            {
              function: 'buyRecord',
              ...namePurchase,
            },
            {
              disableBundling: true,
            },
          );

          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          expect(Object.keys(cachedValue.errorMessages)).toContain(
            writeInteraction!.originalTxId,
          );
          expect(
            cachedValue.errorMessages[writeInteraction!.originalTxId],
          ).toEqual(DEFAULT_INVALID_ARNS_NAME_MESSAGE);
        },
      );

      it('should not be able to remove record', async () => {
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'removeRecord',
            name: 'name1',
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
      });
    });
  });
});
