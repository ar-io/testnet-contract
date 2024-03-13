import {
  Contract,
  JWKInterface,
  WriteInteractionOptions,
  WriteInteractionResponse,
} from 'warp-contracts';

import { calculateAuctionPriceForBlock } from '../src/auctions';
import {
  ARNS_NAME_RESERVED_MESSAGE,
  ARNS_NON_EXPIRED_NAME_MESSAGE,
  AUCTION_SETTINGS,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_INPUT_MESSAGE,
  MINIMUM_ALLOWED_NAME_LENGTH,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
} from '../src/constants';
import { ArNSAuctionData, BlockHeight, IOState, mIOToken } from '../src/types';
import { ANT_CONTRACT_IDS } from './utils/constants';
import {
  getCurrentBlock,
  getLocalArNSContractKey,
  getLocalWallet,
  mineBlocks,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Auctions', () => {
  let contract: Contract<IOState>;
  let srcContractId: string;
  let nonContractOwner: JWKInterface;
  let nonContractOwnerAddress: string;
  let prevState: IOState;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
    nonContractOwner = getLocalWallet(1);
    contract = warp.contract<IOState>(srcContractId).connect(nonContractOwner);
    nonContractOwnerAddress = await arweave.wallets.getAddress(
      nonContractOwner,
    );
    contract.connect(nonContractOwner);
  });

  beforeEach(async () => {
    // tick so we are always working off freshest state
    await contract.writeInteraction({ function: 'tick' });
    prevState = (await contract.readState()).cachedValue.state as IOState;
  });

  afterEach(() => {
    contract.connect(nonContractOwner);
  });

  describe('submits an auction bid', () => {
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
          const auctionBid = {
            name: badName,
            contractTxId: ANT_CONTRACT_IDS[0],
            type: 'lease',
          };
          const writeInteraction = await writeInteractionOrFail(
            contract,
            {
              function: 'submitAuctionBid',
              ...auctionBid,
            },
            {
              disableBundling: true,
            },
          );

          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          expect(Object.keys(cachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(
            cachedValue.errorMessages[writeInteraction.originalTxId],
          ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
          expect(cachedValue.state).toEqual(prevState);
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
        0,
        1,
        3.5,
      ])(
        'should throw an error when an invalid type is submitted: %s',
        async (badType) => {
          const auctionBid = {
            name: 'apple',
            contractTxId: ANT_CONTRACT_IDS[0],
            type: badType,
          };
          const writeInteraction = await writeInteractionOrFail(
            contract,
            {
              function: 'submitAuctionBid',
              ...auctionBid,
            },
            {
              disableBundling: true,
            },
          );

          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          expect(Object.keys(cachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(
            cachedValue.errorMessages[writeInteraction.originalTxId],
          ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
          expect(cachedValue.state).toEqual(prevState);
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
        0,
        1,
        3.5,
      ])(
        'should throw an error when an invalid contract TX id is provided: %s',
        async (badTxId) => {
          const auctionBid = {
            name: 'apple',
            contractTxId: badTxId,
            type: 'lease',
          };
          const writeInteraction = await writeInteractionOrFail(
            contract,
            {
              function: 'submitAuctionBid',
              ...auctionBid,
            },
            {
              disableBundling: true,
            },
          );

          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          expect(Object.keys(cachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(
            cachedValue.errorMessages[writeInteraction.originalTxId],
          ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
          expect(cachedValue.state).toEqual(prevState);
        },
      );
    });

    describe('with valid input', () => {
      describe('for a lease', () => {
        describe('for a non-existent auction', () => {
          let auctionTxId: string;
          let auctionObj: ArNSAuctionData | undefined;
          const auctionBid = {
            name: 'apple',
            contractTxId: ANT_CONTRACT_IDS[0],
          };

          it('should create the initial auction object', async () => {
            const writeInteraction = await writeInteractionOrFail(contract, {
              function: 'submitAuctionBid',
              ...auctionBid,
            });
            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            const { auctions, balances } = cachedValue.state as IOState;
            expect(auctions[auctionBid.name]).not.toBe(undefined);
            expect(auctions[auctionBid.name]).toEqual(
              expect.objectContaining({
                floorPrice: expect.any(Number),
                startPrice: expect.any(Number),
                type: 'lease',
                endHeight:
                  (await getCurrentBlock(arweave)).valueOf() +
                  AUCTION_SETTINGS.auctionDuration,
                startHeight: (await getCurrentBlock(arweave)).valueOf(),
                initiator: nonContractOwnerAddress,
                contractTxId: ANT_CONTRACT_IDS[0],
                years: 1,
              }),
            );
            expect(balances[nonContractOwnerAddress]).toEqual(
              prevState.balances[nonContractOwnerAddress] -
                auctions[auctionBid.name].floorPrice,
            );
            // for the remaining tests
            auctionObj = auctions[auctionBid.name];
            auctionTxId = writeInteraction.originalTxId;
            // TODO: Check for incremented state
          });

          describe('another bid', () => {
            it('should throw an error when the bid does not meet the minimum required', async () => {
              const auctionBid = {
                name: 'apple',
                qty: 100, // not going to win it
                contractTxId: ANT_CONTRACT_IDS[0],
              };
              // connect using another wallet
              const separateWallet = getLocalWallet(2);
              contract.connect(separateWallet);
              const writeInteraction = await writeInteractionOrFail(contract, {
                function: 'submitAuctionBid',
                ...auctionBid,
              });
              expect(writeInteraction?.originalTxId).not.toBeUndefined();
              const { cachedValue } = await contract.readState();
              expect(Object.keys(cachedValue.errorMessages)).toContain(
                writeInteraction.originalTxId,
              );
              expect(
                cachedValue.errorMessages[writeInteraction.originalTxId],
              ).toEqual(
                expect.stringContaining(
                  `The bid (${100} IO) is less than the current required minimum bid`,
                ),
              );
              const { auctions, records, balances } =
                cachedValue.state as IOState;
              expect(auctions[auctionBid.name]).toEqual(auctionObj);
              expect(records[auctionBid.name]).toBeUndefined();
              expect(balances).toEqual(prevState.balances);
            });

            it('should update the records object when a winning bid comes in', async () => {
              // fast forward to the last allowed block for the auction bid
              await mineBlocks(arweave, 5);
              if (!auctionObj) {
                throw new Error('auctionObj is undefined');
              }
              const winningBidQty = calculateAuctionPriceForBlock({
                startHeight: new BlockHeight(auctionObj.startHeight),
                startPrice: new mIOToken(auctionObj.startPrice),
                floorPrice: new mIOToken(auctionObj.floorPrice),
                currentBlockHeight: await getCurrentBlock(arweave),
                auctionSettings: AUCTION_SETTINGS,
              }).valueOf();
              const auctionBid = {
                name: 'apple',
                qty: winningBidQty,
                contractTxId: ANT_CONTRACT_IDS[1],
              };
              // connect using another wallet
              const separateWallet = getLocalWallet(2);
              contract.connect(separateWallet);
              const winnerAddress = await arweave.wallets.getAddress(
                separateWallet,
              );
              const writeInteraction = await contract.writeInteraction({
                function: 'submitAuctionBid',
                ...auctionBid,
              });
              const pricePaidForBlock = calculateAuctionPriceForBlock({
                startHeight: new BlockHeight(auctionObj.startHeight),
                startPrice: new mIOToken(auctionObj.startPrice),
                floorPrice: new mIOToken(auctionObj.floorPrice),
                currentBlockHeight: await getCurrentBlock(arweave),
                auctionSettings: AUCTION_SETTINGS,
              }).valueOf();
              expect(writeInteraction?.originalTxId).not.toBeUndefined();
              const { cachedValue } = await contract.readState();
              expect(cachedValue.errorMessages).not.toContain(auctionTxId);
              const { auctions, records, balances } =
                cachedValue.state as IOState;
              expect(auctions[auctionBid.name]).toBeUndefined();
              expect(records[auctionBid.name]).toEqual({
                contractTxId: ANT_CONTRACT_IDS[1],
                endTimestamp: expect.any(Number),
                startTimestamp: expect.any(Number),
                undernames: expect.any(Number),
                purchasePrice: pricePaidForBlock,
                type: 'lease',
              });
              expect(balances[winnerAddress]).toEqual(
                prevState.balances[winnerAddress] - pricePaidForBlock,
              );
              expect(balances[auctionObj.initiator]).toEqual(
                prevState.balances[auctionObj.initiator] +
                  auctionObj.floorPrice,
              );
              expect(balances[srcContractId]).toEqual(
                // Uses the smartweave contract ID to act as the protocol balance
                prevState.balances[srcContractId] + pricePaidForBlock,
              );
              // clear out the auction obj
              auctionObj = undefined;
            });
          });

          it('should throw an error if the name already exist in records', async () => {
            const auctionBid = {
              name: 'apple',
              contractTxId: ANT_CONTRACT_IDS[0],
            };
            // connect using another wallet
            const separateWallet = getLocalWallet(2);
            contract.connect(separateWallet);
            const writeInteraction = await writeInteractionOrFail(contract, {
              function: 'submitAuctionBid',
              ...auctionBid,
            });
            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            const { auctions, balances } = cachedValue.state as IOState;
            expect(Object.keys(cachedValue.errorMessages)).toContain(
              writeInteraction.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction.originalTxId],
            ).toEqual(ARNS_NON_EXPIRED_NAME_MESSAGE);
            expect(auctions[auctionBid.name]).toBeUndefined();
            expect(balances).toEqual(prevState.balances);
          });

          it('should throw an error if a name is reserved that has no expiration', async () => {
            const auctionBid = {
              name: 'www',
              contractTxId: ANT_CONTRACT_IDS[0],
            };
            const writeInteraction = await writeInteractionOrFail(contract, {
              function: 'submitAuctionBid',
              ...auctionBid,
            });
            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            const { auctions, balances } = cachedValue.state as IOState;
            expect(Object.keys(cachedValue.errorMessages)).toContain(
              writeInteraction.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction.originalTxId],
            ).toEqual(ARNS_NAME_RESERVED_MESSAGE);
            expect(auctions[auctionBid.name]).toBeUndefined();
            expect(balances).toEqual(prevState.balances);
          });

          it('should throw an error if less than the short name minimum length and short name expiration has not passed', async () => {
            const auctionBid = {
              name: 'ibm',
              contractTxId: ANT_CONTRACT_IDS[0],
            };
            const writeInteraction = await writeInteractionOrFail(contract, {
              function: 'submitAuctionBid',
              ...auctionBid,
            });
            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            const { auctions, balances } = cachedValue.state as IOState;
            expect(Object.keys(cachedValue.errorMessages)).toContain(
              writeInteraction.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction.originalTxId],
            ).toEqual(
              `Name is less than ${MINIMUM_ALLOWED_NAME_LENGTH} characters. It will be available for auction after ${SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP}.`,
            );
            expect(auctions[auctionBid.name]).toBeUndefined();
            expect(balances).toEqual(prevState.balances);
          });

          it('should throw an error if a name is reserved for a specific wallet without an expiration', async () => {
            const auctionBid = {
              name: 'www',
              contractTxId: ANT_CONTRACT_IDS[0],
            };
            // connect using another wallet
            const separateWallet = getLocalWallet(2);
            contract.connect(separateWallet);
            const writeInteraction = await writeInteractionOrFail(contract, {
              function: 'submitAuctionBid',
              ...auctionBid,
            });
            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            const { auctions, balances } = cachedValue.state as IOState;
            expect(Object.keys(cachedValue.errorMessages)).toContain(
              writeInteraction.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction.originalTxId],
            ).toEqual(ARNS_NAME_RESERVED_MESSAGE);
            expect(auctions[auctionBid.name]).toBeUndefined();
            expect(balances).toEqual(prevState.balances);
          });

          it('should start the auction if the reserved target submits the auction bid', async () => {
            const auctionBid = {
              name: 'auction',
              contractTxId: ANT_CONTRACT_IDS[0],
            };
            const writeInteraction = await writeInteractionOrFail(contract, {
              function: 'submitAuctionBid',
              ...auctionBid,
            });
            expect(writeInteraction?.originalTxId).not.toBe(undefined);
            const { cachedValue } = await contract.readState();
            const { auctions, balances, reserved } =
              cachedValue.state as IOState;
            expect(Object.keys(cachedValue.errorMessages)).not.toContain(
              writeInteraction.originalTxId,
            );
            expect(auctions[auctionBid.name]).toEqual({
              floorPrice: expect.any(Number),
              startPrice: expect.any(Number),
              type: 'lease',
              startHeight: (await getCurrentBlock(arweave)).valueOf(),
              endHeight:
                (await getCurrentBlock(arweave)).valueOf() +
                AUCTION_SETTINGS.auctionDuration,
              initiator: nonContractOwnerAddress,
              contractTxId: ANT_CONTRACT_IDS[0],
              years: 1,
            });
            expect(balances[nonContractOwnerAddress]).toEqual(
              prevState.balances[nonContractOwnerAddress] -
                auctions[auctionBid.name].floorPrice,
            );
            expect(reserved[auctionBid.name]).toBeUndefined();
          });
        });
      });
    });

    describe('for a permabuy', () => {
      let auctionTxId: string;
      let auctionObj: ArNSAuctionData;
      const auctionBid = {
        name: 'microsoft',
        contractTxId: ANT_CONTRACT_IDS[0],
        type: 'permabuy',
      };

      it('should create the initial auction object', async () => {
        const writeInteraction = await writeInteractionOrFail(contract, {
          function: 'submitAuctionBid',
          ...auctionBid,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const { auctions, balances } = cachedValue.state as IOState;
        expect(auctions[auctionBid.name]).not.toBe(undefined);
        expect(auctions[auctionBid.name]).toEqual({
          floorPrice: expect.any(Number),
          startPrice: expect.any(Number),
          type: 'permabuy',
          startHeight: (await getCurrentBlock(arweave)).valueOf(),
          endHeight:
            (await getCurrentBlock(arweave)).valueOf() +
            AUCTION_SETTINGS.auctionDuration,
          initiator: nonContractOwnerAddress,
          contractTxId: ANT_CONTRACT_IDS[0],
        });
        expect(balances[nonContractOwnerAddress]).toEqual(
          prevState.balances[nonContractOwnerAddress] -
            auctions[auctionBid.name].floorPrice,
        );
        // for the remaining tests
        auctionObj = auctions[auctionBid.name];
        auctionTxId = writeInteraction.originalTxId;
        // TODO: Check that number of purchases is incremented
      });

      it('should update the records object and increment demand factor for the current period when a winning bid comes in', async () => {
        const { demandFactoring: prevDemandFactoringData } = prevState;
        const prevDemandFactorPurchasesForPeriod =
          prevDemandFactoringData.purchasesThisPeriod;

        // fast forward to lower auction price
        await mineBlocks(arweave, 5);
        const winningBidQty = calculateAuctionPriceForBlock({
          startHeight: new BlockHeight(auctionObj.startHeight),
          startPrice: new mIOToken(auctionObj.startPrice),
          floorPrice: new mIOToken(auctionObj.floorPrice),
          currentBlockHeight: await getCurrentBlock(arweave),
          auctionSettings: AUCTION_SETTINGS,
        }).valueOf();
        const auctionBid = {
          name: 'microsoft',
          qty: winningBidQty,
          contractTxId: ANT_CONTRACT_IDS[1],
        };
        // connect using another wallet
        const separateWallet = getLocalWallet(2);
        contract.connect(separateWallet);
        const winnerAddress = await arweave.wallets.getAddress(separateWallet);
        const writeInteraction = await contract.writeInteraction({
          function: 'submitAuctionBid',
          ...auctionBid,
        });
        const pricePaidForBlock = calculateAuctionPriceForBlock({
          startHeight: new BlockHeight(auctionObj.startHeight),
          startPrice: new mIOToken(auctionObj.startPrice),
          floorPrice: new mIOToken(auctionObj.floorPrice),
          currentBlockHeight: await getCurrentBlock(arweave),
          auctionSettings: AUCTION_SETTINGS,
        }).valueOf();
        expect(writeInteraction?.originalTxId).not.toBeUndefined();
        const { cachedValue } = await contract.readState();
        expect(cachedValue.errorMessages).not.toContain(auctionTxId);
        const {
          auctions,
          records,
          balances,
          demandFactoring: newDemandFactoringData,
        } = cachedValue.state as IOState;
        expect(records[auctionBid.name]).toEqual({
          contractTxId: ANT_CONTRACT_IDS[1],
          type: 'permabuy',
          startTimestamp: expect.any(Number),
          undernames: expect.any(Number),
          purchasePrice: pricePaidForBlock,
        });
        expect(auctions[auctionBid.name]).toBeUndefined();
        expect(balances[winnerAddress]).toEqual(
          prevState.balances[winnerAddress] - pricePaidForBlock,
        );
        expect(balances[auctionObj.initiator]).toEqual(
          prevState.balances[auctionObj.initiator] + auctionObj.floorPrice,
        );
        expect(balances[srcContractId]).toEqual(
          prevState.balances[srcContractId] + pricePaidForBlock,
        );
        expect(newDemandFactoringData.purchasesThisPeriod).toEqual(
          prevDemandFactorPurchasesForPeriod + 1,
        );
      });
    });

    describe('for an eager initiator', () => {
      let auctionTxId: string;
      let auctionObj: ArNSAuctionData;
      const auctionBid = {
        name: 'tesla',
        contractTxId: ANT_CONTRACT_IDS[0],
      };

      it('should create the initial auction object', async () => {
        const writeInteraction = await writeInteractionOrFail(contract, {
          function: 'submitAuctionBid',
          ...auctionBid,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const { auctions, balances } = cachedValue.state as IOState;
        expect(auctions[auctionBid.name]).not.toBe(undefined);
        expect(auctions[auctionBid.name]).toEqual({
          floorPrice: expect.any(Number),
          startPrice: expect.any(Number),
          type: 'lease',
          startHeight: (await getCurrentBlock(arweave)).valueOf(),
          endHeight:
            (await getCurrentBlock(arweave)).valueOf() +
            AUCTION_SETTINGS.auctionDuration,
          initiator: nonContractOwnerAddress,
          contractTxId: ANT_CONTRACT_IDS[0],
          years: 1,
        });
        expect(balances[nonContractOwnerAddress]).toEqual(
          prevState.balances[nonContractOwnerAddress] -
            auctions[auctionBid.name].floorPrice,
        );
        // for the remaining tests
        auctionObj = auctions[auctionBid.name];
        auctionTxId = writeInteraction.originalTxId;
      });

      it('should update the records when the caller is the initiator, and only withdraw the difference of the current bid to the original floor price that was already withdrawn from the initiator', async () => {
        // fast forward a few blocks, then construct winning bid
        await mineBlocks(arweave, 5);
        const winningBidQty = calculateAuctionPriceForBlock({
          startHeight: new BlockHeight(auctionObj.startHeight),
          startPrice: new mIOToken(auctionObj.startPrice),
          floorPrice: new mIOToken(auctionObj.floorPrice),
          currentBlockHeight: await getCurrentBlock(arweave),
          auctionSettings: AUCTION_SETTINGS,
        }).valueOf();
        const auctionBid = {
          name: 'tesla',
          qty: winningBidQty,
          contractTxId: ANT_CONTRACT_IDS[1],
        };
        const writeInteraction = await contract.writeInteraction({
          function: 'submitAuctionBid',
          ...auctionBid,
        });
        // we always take the lesser of the submitted and the cost of auction at a given block
        const pricePaidForBlock = calculateAuctionPriceForBlock({
          startHeight: new BlockHeight(auctionObj.startHeight),
          startPrice: new mIOToken(auctionObj.startPrice),
          floorPrice: new mIOToken(auctionObj.floorPrice),
          currentBlockHeight: await getCurrentBlock(arweave),
          auctionSettings: AUCTION_SETTINGS,
        }).valueOf();
        expect(writeInteraction?.originalTxId).not.toBeUndefined();
        const { cachedValue } = await contract.readState();
        expect(cachedValue.errorMessages).not.toContain(auctionTxId);
        const { auctions, records, balances } = cachedValue.state as IOState;
        expect(auctions[auctionBid.name]).toBeUndefined();
        expect(records[auctionBid.name]).toEqual({
          contractTxId: ANT_CONTRACT_IDS[1],
          type: 'lease',
          endTimestamp: expect.any(Number),
          startTimestamp: expect.any(Number),
          undernames: DEFAULT_UNDERNAME_COUNT,
          purchasePrice: pricePaidForBlock,
        });
        const excessValueForInitiator =
          pricePaidForBlock - auctionObj.floorPrice;
        expect(balances[nonContractOwnerAddress]).toEqual(
          prevState.balances[nonContractOwnerAddress] - excessValueForInitiator,
        );
        expect(balances[srcContractId]).toEqual(
          prevState.balances[srcContractId] + pricePaidForBlock,
        );
      });
    });
  });
});

async function writeInteractionOrFail<Input = unknown>(
  contract: Contract<IOState>,
  input: Input,
  options?: WriteInteractionOptions,
): Promise<WriteInteractionResponse> {
  const writeInteraction = await contract.writeInteraction(input, options);
  if (!writeInteraction) {
    throw new Error('Contract write interaction returned null unexpectedly');
  }
  return writeInteraction;
}
