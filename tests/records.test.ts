import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { BlockTimestamp, IOState } from '../src/types';
import {
  ANT_CONTRACT_IDS,
  ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE,
  ARNS_NAME_RESERVED_MESSAGE,
  DEFAULT_UNDERNAME_COUNT,
  INVALID_INPUT_MESSAGE,
  INVALID_SHORT_NAME,
  MAX_YEARS,
  NON_EXPIRED_ARNS_NAME_MESSAGE,
} from './utils/constants';
import {
  calculatePermabuyFee,
  calculateRegistrationFee,
  getLocalArNSContractKey,
  getLocalWallet,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Records', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(() => {
    srcContractId = getLocalArNSContractKey('id');
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
      const expectObjected = {
        name: 'name1',
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        contractTxID: expect.any(String),
        undernames: expect.any(Number),
        type: 'lease',
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

      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculateRegistrationFee({
        name: namePurchase.name,
        type: 'lease',
        fees: prevState.fees,
        years: namePurchase.years,
        currentBlockTimestamp: new BlockTimestamp(currentBlock.timestamp),
        demandFactoring: prevState.demandFactoring, // TODO: is this the right state instance to use?
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { balances, records } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction.originalTxId,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        purchasePrice: expectedPurchasePrice,
        undernames: DEFAULT_UNDERNAME_COUNT,
        type: 'lease',
      });
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedPurchasePrice,
      );
      expect(balances[srcContractId]).toEqual(
        prevState.balances[srcContractId] + expectedPurchasePrice,
      );
    });

    it('should be able to lease a name without specifying years and type', async () => {
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

      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculateRegistrationFee({
        name: namePurchase.name!,
        fees: prevState.fees,
        years: 1,
        type: 'lease',
        currentBlockTimestamp: new BlockTimestamp(currentBlock.timestamp),
        demandFactoring: prevState.demandFactoring, // TODO: is this the right state instance to use?
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { balances, records } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction.originalTxId,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        undernames: DEFAULT_UNDERNAME_COUNT,
        purchasePrice: expectedPurchasePrice,
        type: 'lease',
      });
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedPurchasePrice,
      );
      expect(balances[srcContractId]).toEqual(
        prevState.balances[srcContractId] + expectedPurchasePrice,
      );
    });

    it('should be able to permabuy name longer than 12 characters', async () => {
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

      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculatePermabuyFee({
        name: namePurchase.name,
        fees: prevState.fees,
        currentBlockTimestamp: new BlockTimestamp(currentBlock.timestamp),
        demandFactoring: prevState.demandFactoring, // TODO: is this the right state instance to use?
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { balances, records } = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction.originalTxId,
      );
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        type: 'permabuy',
        startTimestamp: expect.any(Number),
        undernames: DEFAULT_UNDERNAME_COUNT,
        purchasePrice: expectedPurchasePrice,
      });
      expect(balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedPurchasePrice,
      );
      expect(balances[srcContractId]).toEqual(
        prevState.balances[srcContractId] + expectedPurchasePrice,
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
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toEqual(
        NON_EXPIRED_ARNS_NAME_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
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
          writeInteraction.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
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
          writeInteraction.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
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
          writeInteraction.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
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
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toEqual(
        ARNS_NAME_RESERVED_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
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
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toEqual(
        INVALID_SHORT_NAME,
      );
      expect(cachedValue.state).toEqual(prevState);
    });

    it('should not be able to buy reserved name when the caller is not the target of the reserved name', async () => {
      const nonNameOwner = getLocalWallet(2);
      contract.connect(nonNameOwner);
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
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toBe(
        ARNS_NAME_RESERVED_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
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
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toBe(
        ARNS_NAME_RESERVED_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
    });

    it('should be able to buy reserved name if it is the target of the reserved name', async () => {
      contract.connect(nonContractOwner);
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

      const currentBlock = await arweave.blocks.getCurrent();
      const expectedPurchasePrice = calculateRegistrationFee({
        name: namePurchase.name,
        type: 'lease',
        fees: prevState.fees,
        years: namePurchase.years,
        currentBlockTimestamp: new BlockTimestamp(currentBlock.timestamp),
        demandFactoring: prevState.demandFactoring, // TODO: is this the right state instance to use?
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const { records, reserved } = cachedValue.state as IOState;
      expect(records[namePurchase.name.toLowerCase()]).not.toBe(undefined);
      expect(records[namePurchase.name.toLowerCase()]).toEqual({
        contractTxId: ANT_CONTRACT_IDS[0],
        endTimestamp: expect.any(Number),
        startTimestamp: expect.any(Number),
        undernames: DEFAULT_UNDERNAME_COUNT,
        purchasePrice: expectedPurchasePrice,
        type: 'lease',
      });
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toBe(
        undefined,
      );
      expect(reserved[namePurchase.name.toLowerCase()]).toEqual(undefined);
    });

    it('should not be able to buy a name if it is a permabuy and less than 12 characters long', async () => {
      const namePurchase = {
        name: 'mustauction',
        contractTxId: ANT_CONTRACT_IDS[0],
        years: 1,
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

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(cachedValue.errorMessages[writeInteraction.originalTxId]).toBe(
        ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
    });
  });
});
