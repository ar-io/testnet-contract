import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { ArNSNamePurchase, IOState } from '../src/contracts/types/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_ANT_CONTRACT_ID,
  DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  DEFAULT_INVALID_ARNS_NAME_MESSAGE,
  DEFAULT_NON_CONTRACT_OWNER_MESSAGE,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
} from './utils/constants';
import {
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
} from './utils/helper';

describe('Records', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;

    beforeAll(() => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    describe('write interactions', () => {
      it('should be able to buy a record', async () => {
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

        await mineBlock(arweave);

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

    beforeAll(() => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
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

        await mineBlock(arweave);

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

        await mineBlock(arweave);

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

          await mineBlock(arweave);

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
