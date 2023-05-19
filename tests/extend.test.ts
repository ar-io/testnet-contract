import { Contract, JWKInterface, PstState } from 'warp-contracts';

import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INVALID_YEARS_MESSAGE,
} from '../src/constants';
import { IOState } from '../src/types';
import { warp } from './setup.jest';
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

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should not be able to extend a record that is not in its grace period', async () => {
      const extendYears = 3;
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
        'This name cannot be extended until the grace period begins.',
      );
      expect(state.records[name].endTimestamp).toEqual(prevExpiration);
    });

    it(`should not be able to extend a record for more than ${MAX_YEARS} years`, async () => {
      const extendYears = 5;
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
        INVALID_YEARS_MESSAGE,
      );
      expect(state.records[name].endTimestamp).toEqual(prevExpiration);
    });

    it('should not be able to extend a non-existent name ', async () => {
      // advance current timer
      const extendYears = 1;
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

    // TODO: mock timers and add a valid name extension
  });
});
