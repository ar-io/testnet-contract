import { tickAuctions } from '../src/actions/write/tick';
import { SECONDS_IN_A_YEAR } from '../src/constants';
import {
  Auction,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
} from '../src/types';

const defaultAuctionSettings = {
  auctionDuration: 2,
  decayInterval: 1,
  decayRate: 0.5,
  floorPriceMultiplier: 1,
  startPriceMultiplier: 10,
};

const testAuction: Auction = {
  startPrice: 100,
  floorPrice: 10,
  startHeight: 0,
  endHeight: 2,
  type: 'permabuy',
  contractTxId: 'test-tx-id',
  initiator: 'test-initiator',
  settings: defaultAuctionSettings,
};

const demandFactorData: DeepReadonly<DemandFactoringData> = {
  currentPeriod: 1,
  trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
  purchasesThisPeriod: 0,
  consecutivePeriodsWithMinDemandFactor: 0,
  demandFactor: 1,
  periodZeroBlockHeight: 0,
};

describe('tickAuctions', () => {
  const blockTimestamp = Date.now();

  it.each([
    [
      'should tick an auction for a permabuy name that has expired',
      {
        auctions: {
          'tick-auction': testAuction,
        },
        demandFactoring: demandFactorData,
      },
      {
        auctions: {},
        records: {
          'tick-auction': {
            contractTxId: 'test-tx-id',
            type: 'permabuy',
            startTimestamp: blockTimestamp,
            undernames: 10,
          },
        },
        demandFactoring: {
          purchasesThisPeriod: 1,
        },
      },
    ],
    [
      'should tick an auction for a leased name that has expired',
      {
        auctions: {
          'tick-leased-auction': {
            ...testAuction,
            type: 'lease',
            years: 1,
          },
        },
        demandFactoring: demandFactorData,
      },
      {
        auctions: {},
        records: {
          'tick-leased-auction': {
            startTimestamp: blockTimestamp,
            undernames: 10,
            endTimestamp: blockTimestamp + SECONDS_IN_A_YEAR,
            type: 'lease',
            contractTxId: 'test-tx-id',
          },
        },
        demandFactoring: {
          purchasesThisPeriod: 1,
        },
      },
    ],
    [
      'should not tick an auction that has not expired yet',
      {
        auctions: {
          'do-not-tick': {
            ...testAuction,
            endHeight: 10,
          },
        },
        demandFactoring: demandFactorData,
      },
      {
        auctions: {
          'do-not-tick': {
            ...testAuction,
            endHeight: 10,
          },
        },
        records: {},
        demandFactoring: {},
      },
    ],
  ])('%s', (_, inputData, expectedData) => {
    const { auctions, records, demandFactoring } = tickAuctions({
      currentBlockHeight: new BlockHeight(5),
      currentBlockTimestamp: new BlockTimestamp(blockTimestamp),
      records: {},
      auctions: inputData.auctions as DeepReadonly<Record<string, Auction>>,
      demandFactoring: inputData.demandFactoring,
    });
    expect(auctions).toEqual(expectedData.auctions);
    expect(records).toEqual(expectedData.records);
    expect(demandFactoring).toEqual({
      ...inputData.demandFactoring,
      ...expectedData.demandFactoring,
    });
  });
});
