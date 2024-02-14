import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { buyRecord } from './buyRecord';

describe('buyRecord', () => {
  it.each([
    ['a', 'lease'],
    ['a', 'permabuy'],
    ['long-name', 'lease'],
    ['long-name', 'permabuy'],
  ])(
    'should be able to buy a record of a reserved name when the caller is the target of the reserved name when it is a ',
    async (reservedName: string, type: 'permabuy' | 'lease') => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          caller: 100_000_000_000,
        },
        reserved: {
          [reservedName]: {
            target: 'caller',
            endTimestamp: SmartWeave.block.timestamp + 1000, // some time in the future
          },
        },
      };
      const { state } = await buyRecord(initialState, {
        caller: 'caller',
        input: {
          name: reservedName,
          type,
          contractTxId: stubbedArweaveTxId,
        },
      });
      expect(state.records[reservedName]).toBeDefined();
      expect(state.reserved[reservedName]).toBeUndefined();
    },
  );

  it.each([['a-expired-reserved-name', 'not-short-name', 'reserved']])(
    'should be able to buy a record of a reserved name when the caller is the target of the reserved name',
    async (reservedName: string) => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          ['non-reserved-caller']: 100_000_000_000,
        },
        reserved: {
          [reservedName]: {
            target: 'caller',
            endTimestamp: 0, // expired!
          },
        },
      };
      const { state } = await buyRecord(initialState, {
        caller: 'non-reserved-caller',
        input: {
          name: reservedName,
          type: 'permabuy',
          contractTxId: stubbedArweaveTxId,
        },
      });
      expect(state.records[reservedName]).toBeDefined();
      expect(state.reserved[reservedName]).toBeUndefined();
    },
  );

  it.each([['a', 'test', 'reserved', 'name']])(
    'should not be able to buy a record of a reserved name when the caller is not the target target of the reserved name',
    async (reservedName: string) => {
      const initialState = {
        ...getBaselineState(),
        balances: {
          'non-reserved-caller': 100_000_000_000,
        },
        reserved: {
          [reservedName]: {
            target: 'non-reserved-caller',
            endTimestamp: SmartWeave.block.timestamp + 1000, // some time in the future
          },
        },
      };
      const error = await buyRecord(initialState, {
        caller: 'caller',
        input: {
          name: reservedName,
          type: 'lease',
          contractTxId: stubbedArweaveTxId,
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
    },
  );
});
