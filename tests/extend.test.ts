import { Contract, JWKInterface } from 'warp-contracts';

import { ArNSLeaseData, IOState } from '../src/types';
import {
  ARNS_INVALID_EXTENSION_MESSAGE,
  ARNS_LEASE_LENGTH_MAX_YEARS,
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  SECONDS_IN_A_YEAR,
} from './utils/constants';
import {
  addFunds,
  calculateAnnualRenewalFee,
  getLocalArNSContractKey,
  getLocalWallet,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Extend', () => {
  let contract: Contract<IOState>;
  let srcContractId: string;
  let nonContractOwner: JWKInterface;
  let nonContractOwnerAddress: string;
  let emptyWalletCaller: JWKInterface;
  let prevState: IOState;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
    nonContractOwner = getLocalWallet(1);
    nonContractOwnerAddress = await arweave.wallets.getAddress(
      nonContractOwner,
    );
    contract = warp.contract<IOState>(srcContractId).connect(nonContractOwner);
    emptyWalletCaller = await arweave.wallets.generate();
    const emptyWalletAddress = await arweave.wallets.getAddress(
      emptyWalletCaller,
    );
    await addFunds(arweave, emptyWalletAddress);
  });

  beforeEach(async () => {
    // tick so we are always working off freshest state
    await contract.writeInteraction({ function: 'tick' });
    prevState = (await contract.readState()).cachedValue.state;
  });

  afterEach(() => {
    contract.connect(nonContractOwner);
  });

  it('should not be able to extend a record if the caller has insufficient balance', async () => {
    const extendYears = 1;
    const name = 'name-1';
    contract.connect(emptyWalletCaller);

    const writeInteraction = await contract.writeInteraction({
      function: 'extendRecord',
      name: name,
      years: extendYears,
    });

    expect(writeInteraction?.originalTxId).not.toBe(undefined);
    const { cachedValue } = await contract.readState();
    expect(Object.keys(cachedValue.errorMessages)).toContain(
      writeInteraction?.originalTxId,
    );
    expect(cachedValue.errorMessages[writeInteraction?.originalTxId]).toEqual(
      INSUFFICIENT_FUNDS_MESSAGE,
    );
    expect(cachedValue.state).toEqual(prevState);
  });

  it.each([6, '1', 10, Infinity, -Infinity, 0, -1])(
    'should not be able to extend a record using invalid input %s',
    async (extendYears) => {
      const name = 'name-1';

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: extendYears,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        writeInteraction?.originalTxId,
      );
      expect(cachedValue.errorMessages[writeInteraction?.originalTxId]).toEqual(
        expect.stringContaining(INVALID_INPUT_MESSAGE),
      );
      expect(cachedValue.state).toEqual(prevState);
    },
  );

  it(`should not be able to extend a record for more than ${ARNS_LEASE_LENGTH_MAX_YEARS} years`, async () => {
    const extendYears = ARNS_LEASE_LENGTH_MAX_YEARS + 1;
    const name = 'name-1';

    const writeInteraction = await contract.writeInteraction({
      function: 'extendRecord',
      name: name,
      years: extendYears,
    });

    expect(writeInteraction?.originalTxId).not.toBe(undefined);
    const { cachedValue } = await contract.readState();
    expect(Object.keys(cachedValue.errorMessages)).toContain(
      writeInteraction?.originalTxId,
    );
    expect(cachedValue.errorMessages[writeInteraction?.originalTxId]).toEqual(
      expect.stringContaining(INVALID_INPUT_MESSAGE),
    );
    expect(cachedValue.state).toEqual(prevState);
  });

  it('should not be able to extend a non-existent name ', async () => {
    // advance current timer
    const extendYears = ARNS_LEASE_LENGTH_MAX_YEARS - 1;
    const name = 'non-existent-name';

    const writeInteraction = await contract.writeInteraction({
      function: 'extendRecord',
      name: name,
      years: extendYears,
    });

    expect(writeInteraction?.originalTxId).not.toBe(undefined);
    const { cachedValue } = await contract.readState();
    expect(Object.keys(cachedValue.errorMessages)).toContain(
      writeInteraction?.originalTxId,
    );
    expect(cachedValue.errorMessages[writeInteraction?.originalTxId]).toEqual(
      ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
    );
  });

  it('should not be able to extend a permanent name ', async () => {
    // advance current timer
    const extendYears = 1;
    const name = `permabuy`;

    const writeInteraction = await contract.writeInteraction({
      function: 'extendRecord',
      name: name,
      years: extendYears,
    });

    expect(writeInteraction?.originalTxId).not.toBe(undefined);
    const { cachedValue } = await contract.readState();
    expect(Object.keys(cachedValue.errorMessages)).toContain(
      writeInteraction?.originalTxId,
    );
    expect(cachedValue.errorMessages[writeInteraction?.originalTxId]).toEqual(
      ARNS_INVALID_EXTENSION_MESSAGE,
    );
    expect(cachedValue.state).toEqual(prevState);
  });

  // valid name extensions
  it.each([1, 2, 3, 4])(
    'should be able to extend name in grace period by %s years ',
    async (years) => {
      const name = `grace-period-name-${years}`;
      const prevStateRecord = prevState.records[name] as ArNSLeaseData;
      const prevBalance = prevState.balances[nonContractOwnerAddress];
      const fees = prevState.fees;
      const totalExtensionAnnualFee = calculateAnnualRenewalFee({
        name,
        fees,
        years,
      });

      const expectedCostOfExtension = totalExtensionAnnualFee.multiply(
        prevState.demandFactoring.demandFactor,
      );

      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: years,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;

      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction?.originalTxId,
      );
      const record = state.records[name] as ArNSLeaseData;
      expect(record.endTimestamp).toEqual(
        prevStateRecord.endTimestamp + years * SECONDS_IN_A_YEAR,
      );
      expect(state.balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedCostOfExtension.valueOf(),
      );
      expect(state.balances[srcContractId]).toEqual(
        prevState.balances[srcContractId] + expectedCostOfExtension.valueOf(),
      );
    },
  );

  it.each([1, 2, 3, 4])(
    'should be able to extend name not in grace period and not expired by %s years ',
    async (years) => {
      const name = `lease-length-name-${ARNS_LEASE_LENGTH_MAX_YEARS - years}`; // should select the name correctly based on how the helper function generates names
      const prevBalance = prevState.balances[nonContractOwnerAddress];
      const prevStateRecord = prevState.records[name] as ArNSLeaseData;
      const fees = prevState.fees;
      const totalExtensionAnnualFee = calculateAnnualRenewalFee({
        name,
        fees,
        years,
      });

      const expectedCostOfExtension = totalExtensionAnnualFee.multiply(
        prevState.demandFactoring.demandFactor,
      );
      const writeInteraction = await contract.writeInteraction({
        function: 'extendRecord',
        name: name,
        years: years,
      });

      expect(writeInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        writeInteraction?.originalTxId,
      );
      const record = state.records[name] as ArNSLeaseData;
      expect(record.endTimestamp).toEqual(
        prevStateRecord.endTimestamp + years * SECONDS_IN_A_YEAR,
      );
      expect(state.balances[nonContractOwnerAddress]).toEqual(
        prevBalance - expectedCostOfExtension.valueOf(),
      );
      expect(state.balances[srcContractId]).toEqual(
        prevState.balances[srcContractId] + expectedCostOfExtension.valueOf(),
      );
    },
  );
});
