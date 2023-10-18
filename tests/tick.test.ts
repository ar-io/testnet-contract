import {
  tickAuctions,
  tickGatewayRegistry,
  tickRecords,
} from '../src/actions/write/tick';
import { SECONDS_IN_A_YEAR, SECONDS_IN_GRACE_PERIOD } from '../src/constants';
import {
  ArNSName,
  Auction,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  Gateway,
  GatewaySettings,
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

const defaultGatewaySettings: GatewaySettings = {
  label: 'test-gateway', // The friendly name used to label this gateway
  fqdn: 'test-gateway.com', // the fully qualified domain name this gateway can be reached at. eg arweave.net
  port: 443, // The port used by this gateway eg. 443
  protocol: 'https', // The protocol used by this gateway, either http or https
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

describe('tickRecords', () => {
  const blockEndTimestamp = Date.now();

  it.each([
    [
      'should remove a record that is expired and past the grace period',
      {
        records: {
          'expired-record': {
            contractTxId: 'test-tx-id',
            type: 'lease',
            startTimestamp: 0,
            endTimestamp: blockEndTimestamp - SECONDS_IN_GRACE_PERIOD,
            undernames: 10,
          },
        },
      },
      {
        records: {},
      },
    ],
    [
      'should not remove a record that is in the grace period',
      {
        records: {
          'grace-period-record': {
            contractTxId: 'test-tx-id',
            type: 'lease',
            startTimestamp: 0,
            endTimestamp: blockEndTimestamp - SECONDS_IN_GRACE_PERIOD + 1,
            undernames: 10,
          },
        },
      },
      {
        records: {
          'grace-period-record': {
            contractTxId: 'test-tx-id',
            type: 'lease',
            startTimestamp: 0,
            endTimestamp: blockEndTimestamp - SECONDS_IN_GRACE_PERIOD + 1,
            undernames: 10,
          },
        },
      },
    ],
    [
      'should not remove a record that is not expired nor in the grace period',
      {
        records: {
          'grace-period-record': {
            contractTxId: 'test-tx-id',
            type: 'lease',
            startTimestamp: 0,
            endTimestamp: blockEndTimestamp + SECONDS_IN_A_YEAR,
            undernames: 10,
          },
        },
      },
      {
        records: {
          'grace-period-record': {
            contractTxId: 'test-tx-id',
            type: 'lease',
            startTimestamp: 0,
            endTimestamp: blockEndTimestamp + SECONDS_IN_A_YEAR,
            undernames: 10,
          },
        },
      },
    ],
  ])('%s', (_, inputData, expectedData) => {
    const { records } = tickRecords({
      currentBlockTimestamp: new BlockTimestamp(blockEndTimestamp),
      records: inputData.records as DeepReadonly<Record<string, ArNSName>>,
    });
    expect(records).toEqual(expectedData.records);
  });
});

describe('tickGatewayRegistry', () => {
  it.each([
    [
      'should remove a gateway that is leaving and return all of its vaults to the operator',
      {
        gateways: {
          'leaving-operator': {
            operatorStake: 100,
            start: 0,
            end: 5,
            vaults: [
              {
                balance: 100,
                start: 0,
                end: 10,
              },
            ],
            status: 'leaving',
            settings: defaultGatewaySettings,
          },
        },
        balances: {
          'leaving-operator': 0,
        },
      },
      {
        gateways: {},
        balances: {
          'leaving-operator': 200,
        },
      },
    ],
    [
      'should keep a gateway that is joined, but return any vaults that have expired',
      {
        gateways: {
          'existing-operator': {
            operatorStake: 100,
            start: 0,
            end: 10,
            vaults: [
              {
                balance: 100,
                start: 0,
                end: 2,
              },
            ],
            status: 'joined',
            settings: defaultGatewaySettings,
          },
        },
        balances: {
          'existing-operator': 0,
        },
      },
      {
        gateways: {
          'existing-operator': {
            operatorStake: 100,
            start: 0,
            end: 10,
            vaults: [],
            status: 'joined',
            settings: defaultGatewaySettings,
          },
        },
        balances: {
          'existing-operator': 100,
        },
      },
    ],
    [
      'should keep a gateway that is joined and not return any vaults that have not yet expired',
      {
        gateways: {
          'existing-operator': {
            operatorStake: 100,
            start: 0,
            end: 10,
            vaults: [
              {
                balance: 100,
                start: 0,
                end: 10,
              },
            ],
            status: 'joined',
            settings: defaultGatewaySettings,
          },
        },
        balances: {
          'existing-operator': 0,
        },
      },
      {
        gateways: {
          'existing-operator': {
            operatorStake: 100,
            start: 0,
            end: 10,
            vaults: [
              {
                balance: 100,
                start: 0,
                end: 10,
              },
            ],
            status: 'joined',
            settings: defaultGatewaySettings,
          },
        },
        balances: {
          'existing-operator': 0,
        },
      },
    ],
  ])('%s', (_, inputData, expectedData) => {
    const { balances, gateways } = tickGatewayRegistry({
      currentBlockHeight: new BlockHeight(5),
      balances: inputData.balances as DeepReadonly<Record<string, number>>,
      gateways: inputData.gateways as DeepReadonly<Record<string, Gateway>>,
    });
    expect(balances).toEqual(expectedData.balances);
    expect(gateways).toEqual(expectedData.gateways);
  });
});
