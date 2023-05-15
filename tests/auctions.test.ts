import { Contract, JWKInterface, PstState } from "warp-contracts";
import { calculateMinimumAuctionBid, getCurrentBlock, getLocalArNSContractId, getLocalWallet, mineBlocks } from "./utils/helper";
import { arweave, warp } from "./setup.jest";
import { DEFAULT_AUCTION_SETTINGS, INVALID_INPUT_MESSAGE } from "../src/constants";
import { DEFAULT_ANT_CONTRACT_IDS } from "./utils/constants";
import { Auction, AuctionSettings, IOState } from "../src/types.js";

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
                    3.5
                    ])(
                    'should throw an error when an invalid name is submitted: %s',
                    async (badName) => {
                        const auctionBid = {
                            name: badName,
                            details: {
                                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
                            },
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
                )

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
                            details: {
                                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
                            },
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
                )

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
                    3.5
                    ])(
                    'should throw an error when an invalid contract TX id is provided: %s',
                    async (badTxId) => {
                        const auctionBid = {
                            name: 'apple',
                            details: {
                                contractTxId: badTxId,
                            },
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
                )
            });

            describe('with valid input', () => {
                describe('for a non-existent auction', () => {
                    let auctionTxId: string;
                    let auctionObj: Auction;
                    let initialState: IOState;
                    const auctionBid = {
                        name: 'apple',
                        details: {
                            contractTxId:  DEFAULT_ANT_CONTRACT_IDS[0]
                        }
                    }

                    beforeAll(async () => {
                        initialState = (await contract.readState()).cachedValue.state as IOState;
                        const writeInteraction = await contract.writeInteraction({
                            function: 'submitAuctionBid',
                            ...auctionBid
                        });
                        expect(writeInteraction?.originalTxId).not.toBe(undefined);
                        auctionTxId = writeInteraction!.originalTxId;
                    })

                    it('should update the auction object', async () => {
                        const { cachedValue} = await contract.readState();
                        expect(cachedValue.errorMessages).not.toContain(auctionTxId);
                        const { auctions, balances } = cachedValue.state as IOState;
                        expect(auctions[auctionBid.name]).not.toBe(undefined);
                        expect(auctions[auctionBid.name]).toEqual(expect.objectContaining({
                            floorPrice: expect.any(Number),
                            initialPrice: expect.any(Number),
                            type: 'lease',
                            auctionSettingsId: DEFAULT_AUCTION_SETTINGS.current,
                            startHeight: await getCurrentBlock(arweave),
                            details: {
                                contractTxId: DEFAULT_ANT_CONTRACT_IDS[0],
                                years: 1,
                                tierNumber: 1,
                            },
                            vault: {
                                wallet: nonContractOwnerAddress,
                                qty: expect.any(Number)
                            }
                        }));
                        expect(balances[nonContractOwnerAddress]).toEqual(initialState.balances[nonContractOwnerAddress] - auctions[auctionBid.name].vault.qty)
                        auctionObj = auctions[auctionBid.name]
                    });

                    it('should update the records object when a winning bid comes in', async () => {
                        // fast forward a few blocks, then construct winning bid
                        const auctionSettings: AuctionSettings =  DEFAULT_AUCTION_SETTINGS.history[0];
                        await mineBlocks(arweave, 10);
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
                            details: {
                                contractTxId: DEFAULT_ANT_CONTRACT_IDS[1]
                            }
                        }
                        // connect using another wallet
                        const separateWallet = await getLocalWallet(2);
                        await contract.connect(separateWallet);
                        const winnerAddress = await arweave.wallets.getAddress(separateWallet)
                        const writeInteraction = await contract.writeInteraction({
                            function: 'submitAuctionBid',
                            ...auctionBid,
                        })
                        expect(writeInteraction?.originalTxId).not.toBeUndefined();
                        const { cachedValue} = await contract.readState();
                        expect(cachedValue.errorMessages).not.toContain(auctionTxId);
                        const { auctions, records, tiers, balances } = cachedValue.state as IOState;
                        const { wallet: initiator, qty } = auctionObj.vault;
                        expect(auctions[auctionBid.name]).toBeUndefined();
                        expect(records[auctionBid.name]).toEqual({
                            contractTxId: DEFAULT_ANT_CONTRACT_IDS[1],
                            endTimestamp: expect.any(Number),
                            tier: tiers.current[0],
                            type: 'lease'
                        });
                        expect(balances[winnerAddress]).toEqual(initialState.balances[winnerAddress] - winningBidQty);
                        expect(balances[initiator]).toEqual(initialState.balances[initiator])
                    })
                })
            })
        })
    });
});
  