import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_NAME_EXTENSION_TYPE_MESSAGE,
  MAX_YEARS,
  REGISTRATION_TYPES,
  SECONDS_IN_A_YEAR,
} from './utils/constants';
import {
  addFunds,
  calculateAnnualRenewalFee,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Extend', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let nonContractOwner: JWKInterface;
    let nonContractOwnerAddress: string;
    let emptyWalletCaller: JWKInterface;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      nonContractOwnerAddress = await arweave.wallets.getAddress(
        nonContractOwner,
      );
      contract = warp.pst(srcContractId).connect(nonContractOwner);
      emptyWalletCaller = await arweave.wallets.generate();
      await addFunds(arweave, emptyWalletCaller);
    });

    afterEach(() => {
      contract.connect(nonContractOwner);
    });

    it('should not be able to extend a record if the caller has insufficient balance', async () => {
      const extendYears = 1;
      const name = 'name1';
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      contract.connect(emptyWalletCaller);

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        INSUFFICIENT_FUNDS_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
    });

    it.each([6, '1', 10, Infinity, -Infinity, 0, -1])(
      'should not be able to extend a record using invalid input %s',
      async (extendYears) => {
        const name = 'name1';
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;

        const writeInteraction = await contract.writeInteraction({
          function: 'extendRecord',
          name: name,
          years: extendYears,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
      },
    );

    it(`should not be able to extend a record for more than ${MAX_YEARS} years`, async () => {
      const extendYears = MAX_YEARS + 1;
      const name = 'name1';
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining(INVALID_INPUT_MESSAGE),
      );
      expect(cachedValue.state).toEqual(prevState);
    });

    it('should not be able to extend a non-existent name ', async () => {
      // advance current timer
      const extendYears = MAX_YEARS - 1;
      const name = 'non-existent-name';

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
      );
    });

    it('should not be able to extend a permanent name ', async () => {
      // advance current timer
      const extendYears = 1;
      const name = `lease-length-name${REGISTRATION_TYPES.BUY}`;
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        INVALID_NAME_EXTENSION_TYPE_MESSAGE,
      );
      expect(cachedValue.state).toEqual(prevState);
    });

    // valid name extensions
    it.each([1, 2, 3, 4, 5])(
      'should be able to extend name in grace period by %s years ',
      async (years) => {
        const name = `grace-period-name${years}`;
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const record = prevState.records[name]!;
        const prevBalance = prevState.balances[nonContractOwnerAddress];
        const fees = prevState.fees;
        const totalExtensionAnnualFee = calculateAnnualRenewalFee({
          name,
          fees,
          years,
          undernameCount: record.undernames,
          endTimestamp: record.endTimestamp!,
        });

        const writeInteraction = await contract.writeInteraction({
          function: 'extendRecord',
          name: name,
          years: years,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records[name].endTimestamp).toEqual(
          record.endTimestamp! + years * SECONDS_IN_A_YEAR,
        );
        expect(state.balances[nonContractOwnerAddress]).toEqual(
          prevBalance - totalExtensionAnnualFee,
        );
        expect(state.balances[srcContractId]).toEqual(
          prevState.balances[srcContractId] + totalExtensionAnnualFee,
        );
      },
    );

    it.each([1, 2, 3, 4])(
      'should be able to extend name not in grace period and not expired by %s years ',
      async (years) => {
        const name = `lease-length-name${MAX_YEARS - years}`; // should select the name correctly based on how the helper function generates names
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[nonContractOwnerAddress];
        const record = prevState.records[name]!;
        const prevEndTimestamp = record.endTimestamp!;
        const fees = prevState.fees;

        const totalExtensionAnnualFee = calculateAnnualRenewalFee({
          name,
          fees,
          years,
          undernameCount: record.undernames,
          endTimestamp: record.endTimestamp!,
        });

        const writeInteraction = await contract.writeInteraction({
          function: 'extendRecord',
          name: name,
          years: years,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(state.records[name].endTimestamp).toEqual(
          prevEndTimestamp + years * SECONDS_IN_A_YEAR,
        );
        expect(state.balances[nonContractOwnerAddress]).toEqual(
          prevBalance - totalExtensionAnnualFee,
        );
        expect(state.balances[srcContractId]).toEqual(
          prevState.balances[srcContractId] + totalExtensionAnnualFee,
        );
      },
    );
  });
});
