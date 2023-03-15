import { Contract, JWKInterface, PstState } from "warp-contracts";
import { getLocalArNSContractId, getLocalWallet, mineBlock } from "./utils/helper";
import { arweave, warp } from "./setup.jest";
import { ArNSNamePurchase, IOState } from "../src/contracts/types/types";
import { DEFAULT_ANT_CONTRACT_ID, DEFAULT_INVALID_ARNS_NAME_MESSAGE, DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE } from "./utils/constants";

describe('Records', () => {
    let contract: Contract<PstState>;
    let srcContractId: string;

    beforeAll(async () => {
        srcContractId = getLocalArNSContractId();
    })
    
    describe('non-contract owner', () => {
        let nonContractOwner: JWKInterface;

        beforeAll(() => {
            nonContractOwner = getLocalWallet(1)
            contract = warp.pst(srcContractId).connect(nonContractOwner);
        });

        describe('read interactions', () => {

            it('should be able to fetch record details via view state', async () => {
                const { result: record } = await contract.viewState({
                    function: 'getRecord',
                    name: 'name1'
                });
                const expectedTierObj = expect.objectContaining({
                    fee: expect.any(Number),
                    id: expect.any(String),
                    settings: expect.any(Object)
                })
                const expectObjected = expect.objectContaining({
                    tier: expectedTierObj,
                    name: 'name1',
                    endTimestamp: expect.any(Number),
                    contractTxID: expect.any(String)
                })
                expect(record).not.toBe(undefined);
                expect(record).toEqual(expectObjected)
            });

            it('should be return an error when fetching a non-existent record via viewState', async () => {
                const response = await contract.viewState({
                    function: 'getRecord',
                    name: 'non-existent-name'
                });
                expect(response).not.toBe(undefined);
                expect(response?.errorMessage).toEqual('This name does not exist')
            });
        });

        describe('write interactions', () => {

            it('should be able to purchase a name', async () => {
                const namePurchase: ArNSNamePurchase = {
                    name: 'newName',
                    contractTxId: DEFAULT_ANT_CONTRACT_ID,
                    years: 1,
                    tierNumber: 1
                }
                const writeInteraction = await contract.writeInteraction({
                    function: 'buyRecord',
                    ...namePurchase,
                }, {
                    disableBundling: true
                })

                await mineBlock(arweave);

                expect(writeInteraction?.originalTxId).not.toBe(undefined);
                const { cachedValue } = await contract.readState();
                const state = cachedValue.state as IOState;
                expect(Object.keys(cachedValue.errorMessages)).not.toContain(writeInteraction!.originalTxId);
                expect(state.records[namePurchase.name.toLowerCase()]).toEqual(expect.objectContaining({
                    contractTxId: DEFAULT_ANT_CONTRACT_ID,
                    tier: state.tiers.current[1],
                    endTimestamp: expect.any(Number)
                }));
            });

            it('should not be able to purchase a name that has not expired', async () => {
                const namePurchase: ArNSNamePurchase = {
                    name: 'newName',
                    contractTxId: DEFAULT_ANT_CONTRACT_ID,
                    years: 1,
                    tierNumber: 1
                }
                const writeInteraction = await contract.writeInteraction({
                    function: 'buyRecord',
                    ...namePurchase,
                }, {
                    disableBundling: true
                })

                await mineBlock(arweave);

                expect(writeInteraction?.originalTxId).not.toBe(undefined);
                const { cachedValue } = await contract.readState();
                expect(Object.keys(cachedValue.errorMessages)).toContain(writeInteraction!.originalTxId);
                expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE)
            });

            it('should not be able to purchase a name is invalid', async () => {
                const namePurchase: ArNSNamePurchase = {
                    name: 'invalid.name',
                    contractTxId: DEFAULT_ANT_CONTRACT_ID,
                    years: 1,
                    tierNumber: 1
                }
                const writeInteraction = await contract.writeInteraction({
                    function: 'buyRecord',
                    ...namePurchase,
                }, {
                    disableBundling: true
                })

                await mineBlock(arweave);

                expect(writeInteraction?.originalTxId).not.toBe(undefined);
                const { cachedValue } = await contract.readState();
                expect(Object.keys(cachedValue.errorMessages)).toContain(writeInteraction!.originalTxId);
                expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(DEFAULT_INVALID_ARNS_NAME_MESSAGE)
            });
        })
    });
});
