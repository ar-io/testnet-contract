import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { ArNSNamePurchase, IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_ANT_CONTRACT_ID,
  DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE,
  DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_INVALID_ARNS_NAME_MESSAGE,
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
    contract = warp.pst(srcContractId);
  });

  describe('any wallet', () => {
    let nonContractOwner: JWKInterface;
    let nonContractOwnerAddress: string;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
    });

    beforeEach(() => {
      contract.connect(nonContractOwner);
    });

    describe('read interactions', () => {
      it('should be able to fetch record details via view state', async () => {
        const { result: record } = await contract.viewState({
          function: 'record',
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
          function: 'record',
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

        const purchasedTierId = prevState.tiers.current[0];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
            tier: state.tiers.current[0],
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

        const purchasedTierId = prevState.tiers.current[0];
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
            tier: state.tiers.current[0],
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
    });

    describe('reserved names', () => {
      it('should not be able to buy a reserved name when not the reserved target', async () => {
        const reservedNamePurchase1: ArNSNamePurchase = {
          name: 'www', // this short name is not owned by anyone and has no expiration
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

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(state.records[reservedNamePurchase1.name.toLowerCase()]).toEqual(
          undefined,
        );
        expect(state.reserved[reservedNamePurchase1.name]).not.toBe(undefined);
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
      });

      it('should not be able to buy a record when name when is shorter than minimum allowed characters and it is not reserved', async () => {
        const namePurchase: ArNSNamePurchase = {
          name: 'iam',
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
        const state = cachedValue.state as IOState;
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          undefined,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE);
      });

      it('should not be able to buy reserved name when the caller is not the target of the reserved name', async () => {
        const nonNameOwner = getLocalWallet(2);
        const namePurchase: ArNSNamePurchase = {
          name: 'twitter',
          contractTxId: DEFAULT_ANT_CONTRACT_ID,
          years: 1,
          tierNumber: 1,
        };
        contract.connect(nonNameOwner);
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
        const state = cachedValue.state as IOState;
        expect(state.records[namePurchase.name.toLowerCase()]).toBe(undefined);
        expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toBe(
          DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
        );
      });

      it('should not be able to buy reserved name that has no target, but is not expired', async () => {
        const namePurchase: ArNSNamePurchase = {
          name: 'google',
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
        const state = cachedValue.state as IOState;
        expect(state.records[namePurchase.name.toLowerCase()]).toBe(undefined);
        expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toBe(
          DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
        );
        expect(state.reserved[namePurchase.name.toLowerCase()]).not.toBe(
          undefined,
        );
      });

      it('should be able to buy reserved name when the caller is the target of the reserved name', async () => {
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

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(state.records[namePurchase.name.toLowerCase()]).not.toBe(
          undefined,
        );
        expect(state.records[namePurchase.name.toLowerCase()]).toEqual(
          expect.objectContaining({
            contractTxId: DEFAULT_ANT_CONTRACT_ID,
            tier: state.tiers.current[0],
            endTimestamp: expect.any(Number),
          }),
        );
        expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toBe(
          undefined,
        );
        expect(state.reserved[namePurchase.name.toLowerCase()]).toEqual(
          undefined,
        );
      });
    });
  });
});
