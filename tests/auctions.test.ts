import { Contract, JWKInterface, PstState } from 'warp-contracts';

import {
  DEFAULT_ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_AUCTION_SETTINGS,
  DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE,
  DEFAULT_TIERS,
  INVALID_INPUT_MESSAGE,
} from '../src/constants';
import { Auction, AuctionSettings, IOState } from '../src/types.js';
import { arweave, warp } from './setup.jest';
import { DEFAULT_ANT_CONTRACT_IDS } from './utils/constants';
import {
  calculateMinimumAuctionBid,
  getCurrentBlock,
  getLocalArNSContractId,
  getLocalWallet,
  mineBlocks,
} from './utils/helper';

describe('Auctions', () => {
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
              contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              type: 'lease',
            };
            const writeInteraction = await contract.writeInteraction(
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
              writeInteraction!.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction!.originalTxId],
            ).toEqual(INVALID_INPUT_MESSAGE);
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
              contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              type: badType,
            };
            const writeInteraction = await contract.writeInteraction(
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
              writeInteraction!.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction!.originalTxId],
            ).toEqual(INVALID_INPUT_MESSAGE);
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
            const writeInteraction = await contract.writeInteraction(
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
              writeInteraction!.originalTxId,
            );
            expect(
              cachedValue.errorMessages[writeInteraction!.originalTxId],
            ).toEqual(INVALID_INPUT_MESSAGE);
          },
        );
      });

      describe('with valid input', () => {
        describe('for a lease', () => {
          describe('for a non-existent auction', () => {
            let auctionTxId: string;
            let auctionObj: Auction;
            let prevState: IOState;
            const auctionBid = {
              name: 'apple',
              contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
            };

            beforeEach(async () => {
              prevState = (await contract.readState()).cachedValue
                .state as IOState;
              contract.connect(nonContractOwner);
            });

            it('should create the initial auction object', async () => {
              const writeInteraction = await contract.writeInteraction({
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
                  initialPrice: expect.any(Number),
                  type: 'lease',
                  auctionSettingsId: DEFAULT_AUCTION_SETTINGS.current,
                  startHeight: await getCurrentBlock(arweave),
                  details: {
                    contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
                    years: 1,
                    tier: DEFAULT_TIERS.current[0],
                  },
                  vault: {
                    wallet: nonContractOwnerAddress,
                    qty: expect.any(Number),
                  },
                }),
              );
              expect(balances[nonContractOwnerAddress]).toEqual(
                prevState.balances[nonContractOwnerAddress] -
                  auctions[auctionBid.name].vault.qty,
              );
              // for the remaining tests
              auctionObj = auctions[auctionBid.name];
              auctionTxId = writeInteraction!.originalTxId;
            });

            describe('another bid', () => {
              it('should throw an error when the bid does not meet the minimum required', async () => {
                const auctionBid = {
                  name: 'apple',
                  qty: 100, // not going to win it
                  contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
                };
                // connect using another wallet
                const separateWallet = await getLocalWallet(2);
                await contract.connect(separateWallet);
                const secondAddress = await arweave.wallets.getAddress(
                  separateWallet,
                );
                const writeInteraction = await contract.writeInteraction({
                  function: 'submitAuctionBid',
                  ...auctionBid,
                });
                expect(writeInteraction?.originalTxId).not.toBeUndefined();
                const { cachedValue } = await contract.readState();
                expect(Object.keys(cachedValue.errorMessages)).toContain(
                  writeInteraction!.originalTxId,
                );
                expect(
                  cachedValue.errorMessages[writeInteraction!.originalTxId],
                ).toEqual(
                  expect.stringContaining(
                    `The bid (${100} IO) is less than the current required minimum bid`,
                  ),
                );
                const { auctions, records, balances } =
                  cachedValue.state as IOState;
                expect(auctions[auctionBid.name]).toEqual(auctionObj);
                expect(records[auctionBid.name]).toBeUndefined();
                expect(balances[nonContractOwnerAddress]).toEqual(
                  prevState.balances[nonContractOwnerAddress],
                );
                expect(balances[secondAddress]).toEqual(
                  prevState.balances[secondAddress],
                );
              });

              it('should update the records object when a winning bid comes in', async () => {
                // fast forward a few blocks, then construct winning bid
                const auctionSettings: AuctionSettings =
                  DEFAULT_AUCTION_SETTINGS.history[0];
                await mineBlocks(arweave, 3504);
                const winningBidQty = calculateMinimumAuctionBid({
                  startHeight: auctionObj.startHeight,
                  initialPrice: auctionObj.initialPrice,
                  floorPrice: auctionObj.floorPrice,
                  currentBlockHeight: await getCurrentBlock(arweave),
                  decayInterval: auctionSettings.decayInterval,
                  decayRate: auctionSettings.decayRate,
                });
                const auctionBid = {
                  name: 'apple',
                  qty: winningBidQty,
                  contractTxId: DEFAULT_ANT_CONTRACT_IDS[1],
                };
                // connect using another wallet
                const separateWallet = await getLocalWallet(2);
                await contract.connect(separateWallet);
                const winnerAddress = await arweave.wallets.getAddress(
                  separateWallet,
                );
                const writeInteraction = await contract.writeInteraction({
                  function: 'submitAuctionBid',
                  ...auctionBid,
                });
                expect(writeInteraction?.originalTxId).not.toBeUndefined();
                const { cachedValue } = await contract.readState();
                expect(cachedValue.errorMessages).not.toContain(auctionTxId);
                const { auctions, records, tiers, balances } =
                  cachedValue.state as IOState;
                const { wallet: initiator, qty } = auctionObj.vault;
                expect(auctions[auctionBid.name]).toBeUndefined();
                expect(records[auctionBid.name]).toEqual({
                  contractTxId: DEFAULT_ANT_CONTRACT_IDS[1],
                  endTimestamp: expect.any(Number),
                  tier: tiers.current[0],
                  type: 'lease',
                });
                expect(balances[winnerAddress]).toEqual(
                  prevState.balances[winnerAddress] - winningBidQty,
                );
                expect(balances[initiator]).toEqual(
                  prevState.balances[initiator] + auctionObj.floorPrice,
                );
              });
            });

            it('should throw an error if the name already exist in records ', async () => {
              const auctionBid = {
                name: 'apple',
                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              };
              // connect using another wallet
              const separateWallet = await getLocalWallet(2);
              const separateWalletAddress = await arweave.wallets.getAddress(
                separateWallet,
              );
              await contract.connect(separateWallet);
              const writeInteraction = await contract.writeInteraction({
                function: 'submitAuctionBid',
                ...auctionBid,
              });
              expect(writeInteraction?.originalTxId).not.toBe(undefined);
              const { cachedValue } = await contract.readState();
              const { auctions, balances } = cachedValue.state as IOState;
              expect(Object.keys(cachedValue.errorMessages)).toContain(
                writeInteraction!.originalTxId,
              );
              expect(
                cachedValue.errorMessages[writeInteraction!.originalTxId],
              ).toEqual(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
              expect(auctions[auctionBid.name]).toBeUndefined();
              expect(balances[separateWalletAddress]).toEqual(
                prevState.balances[separateWalletAddress],
              );
            });

            it('should throw an error if a name is reserved that has no expiration', async () => {
              const auctionBid = {
                name: 'www',
                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              };
              const writeInteraction = await contract.writeInteraction({
                function: 'submitAuctionBid',
                ...auctionBid,
              });
              expect(writeInteraction?.originalTxId).not.toBe(undefined);
              const { cachedValue } = await contract.readState();
              const { auctions, balances } = cachedValue.state as IOState;
              expect(Object.keys(cachedValue.errorMessages)).toContain(
                writeInteraction!.originalTxId,
              );
              expect(
                cachedValue.errorMessages[writeInteraction!.originalTxId],
              ).toEqual(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
              expect(auctions[auctionBid.name]).toBeUndefined();
              expect(balances[nonContractOwnerAddress]).toEqual(
                prevState.balances[nonContractOwnerAddress],
              );
            });

            it('should throw an error if a name is reserved for a specific wallet without an expiration', async () => {
              const auctionBid = {
                name: 'twitter',
                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              };
              // connect using another wallet
              const separateWallet = await getLocalWallet(2);
              const separateWalletAddress = await arweave.wallets.getAddress(
                separateWallet,
              );
              await contract.connect(separateWallet);
              const writeInteraction = await contract.writeInteraction({
                function: 'submitAuctionBid',
                ...auctionBid,
              });
              expect(writeInteraction?.originalTxId).not.toBe(undefined);
              const { cachedValue } = await contract.readState();
              const { auctions, balances } = cachedValue.state as IOState;
              expect(Object.keys(cachedValue.errorMessages)).toContain(
                writeInteraction!.originalTxId,
              );
              expect(
                cachedValue.errorMessages[writeInteraction!.originalTxId],
              ).toEqual(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
              expect(auctions[auctionBid.name]).toBeUndefined();
              expect(balances[separateWalletAddress]).toEqual(
                prevState.balances[separateWalletAddress],
              );
            });

            it('should start the auction if the reserved target submits the auction bid', async () => {
              const auctionBid = {
                name: 'twitter',
                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              };
              const writeInteraction = await contract.writeInteraction({
                function: 'submitAuctionBid',
                ...auctionBid,
              });
              expect(writeInteraction?.originalTxId).not.toBe(undefined);
              const { cachedValue } = await contract.readState();
              const { auctions, balances, reserved } =
                cachedValue.state as IOState;
              expect(Object.keys(cachedValue.errorMessages)).not.toContain(
                writeInteraction!.originalTxId,
              );
              expect(auctions[auctionBid.name]).toEqual(
                expect.objectContaining({
                  floorPrice: expect.any(Number),
                  initialPrice: expect.any(Number),
                  type: 'lease',
                  auctionSettingsId: DEFAULT_AUCTION_SETTINGS.current,
                  startHeight: await getCurrentBlock(arweave),
                  details: {
                    contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
                    years: 1,
                    tier: DEFAULT_TIERS.current[0],
                  },
                  vault: {
                    wallet: nonContractOwnerAddress,
                    qty: expect.any(Number),
                  },
                }),
              );
              expect(balances[nonContractOwnerAddress]).toEqual(
                prevState.balances[nonContractOwnerAddress] -
                  auctions[auctionBid.name].vault.qty,
              );
              expect(reserved[auctionBid.name]).toBeUndefined();
            });
          });
        });
      });

      describe('for a permabuy', () => {
        let auctionTxId: string;
        let auctionObj: Auction;
        let prevState: IOState;
        const auctionBid = {
          name: 'ibm',
          contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
          type: 'permabuy',
        };

        beforeEach(async () => {
          prevState = (await contract.readState()).cachedValue.state as IOState;
          contract.connect(nonContractOwner);
        });

        it('should create the initial auction object', async () => {
          const writeInteraction = await contract.writeInteraction({
            function: 'submitAuctionBid',
            ...auctionBid,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue } = await contract.readState();
          const { auctions, balances } = cachedValue.state as IOState;
          expect(auctions[auctionBid.name]).not.toBe(undefined);
          expect(auctions[auctionBid.name]).toEqual({
            floorPrice: expect.any(Number),
            initialPrice: expect.any(Number),
            type: 'permabuy',
            auctionSettingsId: DEFAULT_AUCTION_SETTINGS.current,
            startHeight: await getCurrentBlock(arweave),
            details: {
              contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
              tier: DEFAULT_TIERS.current[2],
            },
            vault: {
              wallet: nonContractOwnerAddress,
              qty: expect.any(Number),
            },
          });
          expect(balances[nonContractOwnerAddress]).toEqual(
            prevState.balances[nonContractOwnerAddress] -
              auctions[auctionBid.name].vault.qty,
          );
          // for the remaining tests
          auctionObj = auctions[auctionBid.name];
          auctionTxId = writeInteraction!.originalTxId;
        });

        it('should update the records object when a winning bid comes in', async () => {
          // fast forward a few blocks, then construct winning bid
          const auctionSettings: AuctionSettings =
            DEFAULT_AUCTION_SETTINGS.history[0];
          await mineBlocks(arweave, 3504);
          const winningBidQty = calculateMinimumAuctionBid({
            startHeight: auctionObj.startHeight,
            initialPrice: auctionObj.initialPrice,
            floorPrice: auctionObj.floorPrice,
            currentBlockHeight: await getCurrentBlock(arweave),
            decayInterval: auctionSettings.decayInterval,
            decayRate: auctionSettings.decayRate,
          });
          const auctionBid = {
            name: 'ibm',
            qty: winningBidQty,
            contractTxId: DEFAULT_ANT_CONTRACT_IDS[1],
          };
          // connect using another wallet
          const separateWallet = await getLocalWallet(2);
          await contract.connect(separateWallet);
          const winnerAddress = await arweave.wallets.getAddress(
            separateWallet,
          );
          const writeInteraction = await contract.writeInteraction({
            function: 'submitAuctionBid',
            ...auctionBid,
          });
          expect(writeInteraction?.originalTxId).not.toBeUndefined();
          const { cachedValue } = await contract.readState();
          expect(cachedValue.errorMessages).not.toContain(auctionTxId);
          const { auctions, records, tiers, balances } =
            cachedValue.state as IOState;
          const { wallet: initiator, qty } = auctionObj.vault;
          expect(auctions[auctionBid.name]).toBeUndefined();
          expect(records[auctionBid.name]).toEqual({
            contractTxId: DEFAULT_ANT_CONTRACT_IDS[1],
            tier: tiers.current[2],
            type: 'permabuy',
          });
          expect(balances[winnerAddress]).toEqual(
            prevState.balances[winnerAddress] - winningBidQty,
          );
          expect(balances[initiator]).toEqual(
            prevState.balances[initiator] + qty,
          );
        });
      });
    });
  });
});
