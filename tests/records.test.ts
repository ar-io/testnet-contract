import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  ANT_CONTRACT_IDS,
  ARNS_NAME_RESERVED_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  INVALID_TIER_MESSAGE,
  INVALID_YEARS_MESSAGE,
  MAX_YEARS,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
  SECONDS_IN_A_YEAR,
} from './utils/constants';
import {
  calculatePermabuyFee,
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
    let prevState: IOState;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
    });

    beforeEach(async () => {
      contract.connect(nonContractOwner);
      prevState = (await contract.readState()).cachedValue.state as IOState;
    });

    it('should be able to fetch record details via view state', async () => {
      const { result: record } = await contract.viewState({
        function: 'record',
        name: 'name1',
      });
      const expectedTierObj = {
        fee: expect.any(Number),
        id: expect.any(String),
        settings: expect.any(Object),
      };
      const expectObjected = {
        tier: expectedTierObj,
        name: 'name1',
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        contractTxID: expect.any(String),
      };
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

    it('should be able to lease a name for a provided number of years', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevBalance = prevState.balances[nonContractOwnerAddress];
      const namePurchase = {
        name: 'newName',
        contractTxId: ANT_CONTRACT_IDS[0],
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

      const purchasedTierId = prevState.tiers.current[0];
      const purchasedTier = prevState.tiers.history.find(
        (t) => t.id === purchasedTierId,
      )!;
      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculateTotalRegistrationFee(
        namePurchase.name,
        prevState.fees,
        purchasedTier,
        namePurchase.years,
        currentBlock.timestamp,
      );

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { balances, records, tiers } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        tier: tiers.current[0],
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        undernames: expect.any(Number),
        type: 'lease',
      });
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedPurchasePrice,
      );
    });

    it('should be able to lease a name without specifying years, tier, or type', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevBalance = prevState.balances[nonContractOwnerAddress];
      const namePurchase = {
        name: 'newname2',
        contractTxId: ANT_CONTRACT_IDS[0],
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
      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculateTotalRegistrationFee(
        namePurchase.name!,
        prevState.fees,
        purchasedTier,
        1,
        currentBlock.timestamp,
      );

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { balances, records, tiers } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        tier: tiers.current[0],
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        undernames: expect.any(Number),
        type: 'lease',
      });
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedPurchasePrice,
      );
    });

    it('should be able to permabuy name', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevBalance = prevState.balances[nonContractOwnerAddress];
      const namePurchase = {
        name: 'permabuy-name',
        contractTxId: ANT_CONTRACT_IDS[0],
        type: 'permabuy',
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
      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculatePermabuyFee(
        namePurchase.name,
        prevState.fees,
        purchasedTier,
        currentBlock.timestamp,
      );

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { balances, records, tiers } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        tier: tiers.current[0],
        type: 'permabuy',
        startTimestamp: expect.any(Number),
        undernames: expect.any(Number),
      });
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedPurchasePrice,
      );
    });

    it('should not be able to upgrade a record tier with an invalid tier provided', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const namePurchase = {
        name: 'newName2',
        tier: 'invalid-tier',
      };
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'upgradeTier',
          ...namePurchase,
        },
        {
          disableBundling: true,
        },
      );

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { records, balances } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining(INVALID_TIER_MESSAGE),
      );
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevState.balances[nonContractOwnerAddress],
      );
      expect(records[namePurchase.name.toLocaleLowerCase()]).toEqual(
        prevState.records[namePurchase.name.toLowerCase()],
      );
    });

    it('should not be able to upgrade a record tier if the provided tier is less than the current tier', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevRecord = prevState.records['newname2'];
      const namePurchase = {
        name: 'newName2',
        tier: prevRecord.tier,
      };
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'upgradeTier',
          ...namePurchase,
        },
        {
          disableBundling: true,
        },
      );

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { records, balances } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining(INVALID_TIER_MESSAGE),
      );
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevState.balances[nonContractOwnerAddress],
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual(
        expect.objectContaining({
          contractTxId: prevRecord.contractTxId,
          tier: namePurchase.tier,
          endTimestamp: prevRecord.endTimestamp,
        }),
      );
    });

    it('should be able to upgrade a record tier if the provided tier is valid and greater than the current tier', async () => {
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevRecord = prevState.records['newname2'];
      const namePurchase = {
        name: 'newName2',
        tier: prevState.tiers.current[2],
      };
      const writeInteraction = await contract.writeInteraction(
        {
          function: 'upgradeTier',
          ...namePurchase,
        },
        {
          disableBundling: true,
        },
      );
      const currentBlockTimestamp = (await arweave.blocks.getCurrent())
        .timestamp;
      // get the current block height timestamp
      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { records, balances, tiers } = cachedValue.state as IOState;
      const tierFeeDiff =
        (tiers.history.find((t) => t.id === tiers.current[0])?.fee ?? 0) -
        (tiers.history.find((t) => t.id === tiers.current[2])?.fee ?? 0);
      const remainingYears =
        (currentBlockTimestamp - (prevRecord.endTimestamp ?? 0)) /
        SECONDS_IN_A_YEAR;
      const annualTierFeeDifference = tierFeeDiff * remainingYears;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction!.originalTxId,
      );
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevState.balances[nonContractOwnerAddress] - annualTierFeeDifference,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual(
        expect.objectContaining({
          contractTxId: prevRecord.contractTxId,
          tier: namePurchase.tier,
          endTimestamp: prevRecord.endTimestamp,
        }),
      );
    });

    it('should not be able to purchase a name that has not expired', async () => {
      const namePurchase = {
        name: 'newName',
        contractTxId: ANT_CONTRACT_IDS[0],
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

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { records, balances } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        NON_EXPIRED_ARNS_NAME_MESSAGE,
      );
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevState.balances[nonContractOwnerAddress],
      );
      expect(records).toEqual(prevState.records);
    });

    it.each([
      // TODO: add other known invalid names
      '',
      '*&*##$%#',
      '-leading',
      'trailing-',
      'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
      'test.subdomain.name',
    ])(
      'should not be able to purchase an invalid name: %s',
      async (badName) => {
        const namePurchase = {
          name: badName,
          contractTxId: ANT_CONTRACT_IDS[0],
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

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const { balances, records } = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(balances[nonContractOwnerAddress]).toEqual(
          prevState.balances[nonContractOwnerAddress],
        );
        expect(records).toEqual(prevState.records);
      },
    );

    it.each([
      // TODO: add other known invalid names
      '',
      '*&*##$%#',
      '-leading',
      'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
      'test.subdomain.name',
      false,
      true,
      0,
      1,
      3.54,
    ])(
      'should not be able to purchase an invalid tier: %s',
      async (badTier) => {
        const namePurchase = {
          name: 'bad-tier',
          contractTxId: ANT_CONTRACT_IDS[0],
          years: 1,
          tier: badTier,
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
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
      },
    );

    it.each([
      '',
      '*&*##$%#',
      'invalid$special/charcters!',
      'to-short',
      '123456890123456789012345678901234',
      false,
      true,
      0,
      1,
      5.34,
    ])(
      'should not be able to purchase a name with an invalid contractTxId: %s',
      async (badTxId) => {
        const namePurchase = {
          name: 'bad-transaction-id',
          contractTxId: badTxId,
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

    it.each(['', '1', 'string', '*&*##$%#', 0, 2.3, false, true])(
      'should not be able to purchase a name with an invalid number of years: %s',
      async (badYear) => {
        const namePurchase = {
          name: 'good-name',
          contractTxId: ANT_CONTRACT_IDS[0],
          years: badYear,
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
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
      },
    );

    it.each([MAX_YEARS + 1, MAX_YEARS + 10, MAX_YEARS + 100])(
      'should not be able to purchase a name with years not within allowed range: %s',
      async (badYear) => {
        const namePurchase = {
          name: 'good-name',
          contractTxId: ANT_CONTRACT_IDS[0],
          years: badYear,
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
        ).toEqual(INVALID_YEARS_MESSAGE);
      },
    );

    it.each(['', '1', 'string', '*&*##$%#', 2.3, false, true])(
      'should not be able to purchase a name with an invalid tier: %s',
      async (badTier) => {
        const namePurchase = {
          name: 'good-name',
          contractTxId: ANT_CONTRACT_IDS[0],
          years: 1,
          tier: badTier,
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
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
      },
    );

    it.each(['', '1', 'string', '*&*##$%#', 100, 2.3, false, true])(
      'should not be able to purchase a name with an invalid tier number: %s',
      async (badTierNumber) => {
        const namePurchase = {
          name: 'good-name',
          contractTxId: ANT_CONTRACT_IDS[0],
          years: 1,
          tier: badTierNumber,
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
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
      },
    );

    it('should not be able to buy a reserved name when not the reserved target', async () => {
      const reservedNamePurchase1 = {
        name: 'www', // this short name is not owned by anyone and has no expiration
        contractTxId: ANT_CONTRACT_IDS[0],
        years: 1,
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
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        ARNS_NAME_RESERVED_MESSAGE,
      );
    });

    it('should not be able to buy a record when name when is shorter than minimum allowed characters and it is not reserved', async () => {
      const namePurchase = {
        name: 'iam',
        contractTxId: ANT_CONTRACT_IDS[0],
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

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(state.records[namePurchase.name.toLowerCase()]).toEqual(undefined);
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        INVALID_SHORT_NAME,
      );
    });

    it('should not be able to buy reserved name when the caller is not the target of the reserved name', async () => {
      const nonNameOwner = getLocalWallet(2);
      const namePurchase = {
        name: 'twitter',
        contractTxId: ANT_CONTRACT_IDS[0],
        years: 1,
      };
      await contract.connect(nonNameOwner);
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
        ARNS_NAME_RESERVED_MESSAGE,
      );
    });

    it('should not be able to buy reserved name that has no target, but is not expired', async () => {
      const namePurchase = {
        name: 'google',
        contractTxId: ANT_CONTRACT_IDS[0],
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

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(state.records[namePurchase.name.toLowerCase()]).toBe(undefined);
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toBe(
        ARNS_NAME_RESERVED_MESSAGE,
      );
      expect(state.reserved[namePurchase.name.toLowerCase()]).not.toBe(
        undefined,
      );
    });

    it('should be able to buy reserved name if it is the target of the reserved name', async () => {
      await contract.connect(nonContractOwner);
      const namePurchase = {
        name: 'twitter',
        contractTxId: ANT_CONTRACT_IDS[0],
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

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { records, reserved, tiers } = cachedValue.state as IOState;
      expect(records[namePurchase.name.toLowerCase()]).not.toBe(undefined);
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        tier: tiers.current[0],
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        undernames: expect.any(Number),
        type: 'lease',
      });
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toBe(
        undefined,
      );
      expect(reserved[namePurchase.name.toLowerCase()]).toEqual(undefined);
    });
  });
});
