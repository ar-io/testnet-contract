import { Contract, JWKInterface, PstState } from 'warp-contracts';

import {
  ARNS_NAME_RESERVED_MESSAGE,
  AUCTION_SETTINGS,
  INVALID_INPUT_MESSAGE,
  MINIMUM_ALLOWED_NAME_LENGTH,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
  TIERS,
} from '../src/constants';
import { Auction, AuctionSettings, IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import { ANT_CONTRACT_IDS } from './utils/constants';
import {
  calculateMinimumAuctionBid,
  getCurrentBlock,
  getLocalArNSContractId,
  getLocalWallet,
  mineBlocks,
} from './utils/helper';

describe('undernames', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('any address', () => {
    let nonContractOwner: JWKInterface;
    let nonContractOwnerAddress: string;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
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
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernames',
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
          },
        );

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
              name: 'apple',
              qty: badQty,
            };
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernames',
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
          },
        );
      });

      describe('with valid input', () => {
        it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 1000, 10000, 100000, 1000000])(
          'should successfully increase undernames with valid quantity provided: : %s',
          async (goodQty) => {
            const undernameInput = {
              name: 'name1',
              qty: goodQty,
            };
            const writeInteraction = await contract.writeInteraction(
              {
                function: 'increaseUndernames',
                ...undernameInput,
              },
              {
                disableBundling: true,
              },
            );

            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            if (cachedValue.errorMessages) {
                console.log(cachedValue.errorMessages)
            }
            expect(Object.keys(cachedValue.errorMessages)).not.toContain(
              writeInteraction!.originalTxId,
            );

            
            // Add any additional expectations for successful execution here
          },
        );

        it.each(["name1", "name2", "name3"])(
            'should successfully increase undernames with valid name provided: : %s',
            async (validName) => {
              const undernameInput = {
                name: validName,
                qty: 1,
              };
              const writeInteraction = await contract.writeInteraction(
                {
                  function: 'increaseUndernames',
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
              // Add any additional expectations for successful execution here
            },
          );
      });
    });
  });
});
