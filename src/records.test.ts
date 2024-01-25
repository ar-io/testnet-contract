import { isLeaseRecord } from './records';
import { ArNSBaseNameData, ArNSNameData } from './types';

describe('isLeaseRecord function', () => {
  const stubBaseNameData: ArNSBaseNameData = {
    contractTxId: '',
    startTimestamp: 0,
    type: 'permabuy',
    undernames: 0,
    purchasePrice: 0,
  };

  it.each([
    [stubBaseNameData, false],
    [
      {
        ...stubBaseNameData,
        type: 'lease',
        endTimestamp: 1,
      },
      true,
    ],
  ])(
    'should, for record %p, return %s',
    (record: ArNSNameData, expectedValue: boolean) => {
      expect(isLeaseRecord(record)).toEqual(expectedValue);
    },
  );
});
