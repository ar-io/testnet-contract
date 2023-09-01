import { Contract, JWKInterface, PstState } from 'warp-contracts';

import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  INVALID_NAME_EXTENSION_TYPE_MESSAGE,
  INVALID_YEARS_MESSAGE,
  REGISTRATION_TYPES,
  SECONDS_IN_A_YEAR,
} from '../src/constants';
import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import { MAX_YEARS } from './utils/constants';
import { getLocalArNSContractId, getLocalWallet } from './utils/helper';

describe('Extend', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('contract owner', () => {
    let owner: JWKInterface;
    let walletAddress: string;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      walletAddress = await arweave.wallets.getAddress(owner);
      contract = warp.pst(srcContractId).connect(owner);
    });

    afterEach(async () => {
      const { cachedValue: cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;

      if (state.balances[walletAddress] < 1) {
        const tempContract = warp.pst(srcContractId).connect(getLocalWallet(1));
        const tempAddress = await arweave.wallets.getAddress(getLocalWallet(1));
        const qty = state.balances[tempAddress] / 2;
        await tempContract.writeInteraction({
          function: 'transfer',
          target: walletAddress,
          qty: qty,
        });
      }
    });

    it('should not be able to extend a record if the caller has insufficient balance', async () => {
      const extendYears = 1;
      const name = 'name1';
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevExpiration = prevState.records['name1'].endTimestamp;
      const prevBalance = prevState.balances[walletAddress];

      // transfer all funds to another wallet
      const recipientAddress = await arweave.wallets.getAddress(
        getLocalWallet(1),
      );

      await contract.writeInteraction({
        function: 'transfer',
        target: recipientAddress,
        qty: prevBalance,
      });

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        INSUFFICIENT_FUNDS_MESSAGE,
      );
      expect(state.records[name].endTimestamp).toEqual(prevExpiration);
    });

    it.each([6, '1', 10, Infinity, -Infinity, 0, -1])(
      'should not be able to extend a record using invalid input %s',
      async (extendYears) => {
        const name = 'name1';
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevExpiration = prevState.records['name1'].endTimestamp;
        const prevBalance = prevState.balances[walletAddress];

        const writeInteraction = await contract.writeInteraction({
          function: 'extendRecord',
          name: name,
          years: extendYears,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        const state = cachedValue.state as IOState;
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction!.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(state.records[name].endTimestamp).toEqual(prevExpiration);
        expect(state.balances[walletAddress]).toEqual(prevBalance);
      },
    );

    it(`should not be able to extend a record for more than ${MAX_YEARS} years`, async () => {
      const extendYears = MAX_YEARS + 1;
      const name = 'name1';
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;
      const prevExpiration = prevState.records['name1'].endTimestamp;

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        expect.stringContaining(INVALID_INPUT_MESSAGE),
      );
      expect(state.records[name].endTimestamp).toEqual(prevExpiration);
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
      const prevExpiration = prevState.records[name]?.endTimestamp;
      const prevBalance = prevState.balances[walletAddress];

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction!.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction!.originalTxId]).toEqual(
        INVALID_NAME_EXTENSION_TYPE_MESSAGE,
      );
      expect(state.records[name]?.endTimestamp).toEqual(prevExpiration);
      expect(state.balances[walletAddress]).toEqual(prevBalance);
    });

    // valid name extensions
    it.each([1, 2, 3, 4, 5])(
      'should be able to extend name in grace period by %s years ',
      async (years) => {
        const name = `grace-period-name${years}`;
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevEndTimestamp = prevState.records[name].endTimestamp!;
        const prevBalance = prevState.balances[walletAddress];

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
        expect(state.balances[walletAddress]).not.toEqual(prevBalance);
      },
    );

    it.each([1, 2, 3, 4])(
      'should be able to extend name not in grace period and not expired by %s years ',
      async (years) => {
        const name = `lease-length-name${MAX_YEARS - years}`; // should select the name correctly based on how the helper function generates names
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevEndTimestamp = prevState.records[name].endTimestamp!;
        const prevBalance = prevState.balances[walletAddress];

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
        expect(state.balances[walletAddress]).not.toEqual(prevBalance);
      },
    );
  });
});
