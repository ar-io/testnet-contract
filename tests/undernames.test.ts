import { Contract, JWKInterface } from 'warp-contracts';

import {
  DEFAULT_UNDERNAME_COUNT,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MAX_ALLOWED_UNDERNAMES,
  MAX_UNDERNAME_MESSAGE,
} from '../src/constants';
import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  calculateUndernamePermutations,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';

describe('undernames', () => {
  let contract: Contract<IOState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('any address', () => {
    let nonContractOwner: JWKInterface;
    let nonContractOwnerAddress: string;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp
        .contract<IOState>(srcContractId)
        .connect(nonContractOwner);
      nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
    });
    describe('Submits undername increase', () => {
      describe('with bad input', () => {
        it.each([
          '',
          '*&*##$%#',
          '-leading',
          'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
          'test.subdomain.name',
          false,
          true,
          0,
          1,
          3.5,
        ])(
          'should throw an error when an invalid name is submitted: %s',
          async (badName) => {
            const undernameInput = {
              name: badName,
              qty: 1,
            };
            const { cachedValue: initialCachedValue } =
              await contract.readState();
            const initialUndernameCount =
              initialCachedValue.state.records?.[badName as string]?.undernames;
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernameCount',
                ...undernameInput,
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
            ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
            expect(
              cachedValue.state.records[badName as string]?.undernames,
            ).toEqual(initialUndernameCount);
          },
        );
        const arnsName = 'name1';
        it.each([
          '',
          '*&*##$%#',
          '-leading',
          'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
          'test.subdomain.name',
          false,
          true,
          0.5,
          0,
          Infinity,
          -Infinity,
          -1,
          -1000,
        ])(
          'should throw an error when an invalid quantity is provided: %s',
          async (badQty) => {
            const undernameInput = {
              name: arnsName,
              qty: badQty,
            };
            const { cachedValue: initialCachedValue } =
              await contract.readState();
            const initialUndernameCount =
              initialCachedValue.state.records[arnsName].undernames;
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernameCount',
                ...undernameInput,
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
            ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
            expect(cachedValue.state.records[arnsName].undernames).toEqual(
              initialUndernameCount,
            );
          },
        );

        it.each([
          calculateUndernamePermutations(arnsName) + 1,
          calculateUndernamePermutations(arnsName) +
            DEFAULT_UNDERNAME_COUNT +
            1,
          calculateUndernamePermutations(arnsName) + 100,
          MAX_ALLOWED_UNDERNAMES,
          MAX_ALLOWED_UNDERNAMES + 1,
        ])(
          'should throw an error when a quantity over the max allowed undernames is provided: %s',
          async (badQty) => {
            const undernameInput = {
              name: arnsName,
              qty: badQty,
            };
            const { cachedValue: initialCachedValue } =
              await contract.readState();
            const initialUndernameCount =
              initialCachedValue.state.records[arnsName].undernames;
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernameCount',
                ...undernameInput,
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
            ).toEqual(expect.stringContaining(MAX_UNDERNAME_MESSAGE));
            expect(cachedValue.state.records[arnsName].undernames).toEqual(
              initialUndernameCount,
            );
          },
        );
      });

      describe('with valid input', () => {
        const arnsName = 'name1';
        it.each([
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          100,
          1000,
          MAX_ALLOWED_UNDERNAMES - DEFAULT_UNDERNAME_COUNT - 1165, // 1165 is the sum of the previous undername tests
        ])(
          'should successfully increase undernames with valid quantity provided: : %s',
          async (goodQty) => {
            const undernameInput = {
              name: arnsName,
              qty: goodQty,
            };
            const { cachedValue: initialCachedValue } =
              await contract.readState();
            const initialUndernameCount =
              initialCachedValue.state.records[arnsName].undernames;
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernameCount',
                ...undernameInput,
              },
              {
                disableBundling: true,
              },
            );

            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();

            expect(Object.keys(cachedValue.errorMessages)).not.toContain(
              writeInteraction!.originalTxId,
            );
            expect(cachedValue.state.records[arnsName].undernames).toEqual(
              initialUndernameCount + goodQty,
            );

            // Add any additional expectations for successful execution here
          },
        );

        it.each(['name1', 'name2', 'name3'])(
          'should successfully increase undernames with valid name provided: : %s',
          async (validName) => {
            const undernameInput = {
              name: validName,
              qty: 1,
            };
            const { cachedValue: initialCachedValue } =
              await contract.readState();
            const initialUndernameCount =
              initialCachedValue.state.records[validName].undernames;
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernameCount',
                ...undernameInput,
              },
              {
                disableBundling: true,
              },
            );

            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            expect(Object.keys(cachedValue.errorMessages)).not.toContain(
              writeInteraction!.originalTxId,
            );
            expect(cachedValue.state.records[validName].undernames).toEqual(
              initialUndernameCount + 1,
            );
            // Add any additional expectations for successful execution here
          },
        );
      });
    });
  });
});
