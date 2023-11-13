import {
  tickAuctions,
  tickGatewayRegistry,
  tickRecords,
  tickReservedNames,
} from '../../actions/write/tick';
import { SECONDS_IN_A_YEAR, SECONDS_IN_GRACE_PERIOD } from '../../constants';
import {
  AuctionData,
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  GatewaySettings,
  Gateways,
  Records,
  ReservedNames,
} from '../../types';

const defaultAuctionSettings = {
  auctionDuration: 2,
  decayInterval: 1,
  decayRate: 0.5,
  floorPriceMultiplier: 1,
  startPriceMultiplier: 10,
};

const testAuction: AuctionData = {
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
  trailingPeriodRevenues: [0, 0, 0, 0, 0, 0, 0],
  purchasesThisPeriod: 0,
  revenueThisPeriod: 0,
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
            purchasePrice: 10, // the floor price
          },
        },
        demandFactoring: {
          purchasesThisPeriod: 1,
          revenueThisPeriod: 10,
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
            purchasePrice: 10,
          },
        },
        demandFactoring: {
          purchasesThisPeriod: 1,
          revenueThisPeriod: 10,
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
      auctions: inputData.auctions as DeepReadonly<Auctions>,
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
            purchasePrice: 1000,
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
            purchasePrice: 1000,
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
            purchasePrice: 1000,
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
            purchasePrice: 1000,
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
            purchasePrice: 1000,
          },
        },
      },
    ],
  ])('%s', (_, inputData, expectedData) => {
    const { records } = tickRecords({
      currentBlockTimestamp: new BlockTimestamp(blockEndTimestamp),
      records: inputData.records as DeepReadonly<Records>,
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
            observerWallet: 'existing-operator',
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
            observerWallet: 'existing-operator',
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
            observerWallet: 'existing-operator',
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
            observerWallet: 'existing-operator',
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
            observerWallet: 'existing-operator',
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
      balances: inputData.balances as DeepReadonly<Balances>,
      gateways: inputData.gateways as DeepReadonly<Gateways>,
    });
    expect(balances).toEqual(expectedData.balances);
    expect(gateways).toEqual(expectedData.gateways);
  });
});

describe('tickReservedNames', () => {
  const currentBlockTimestamp = Date.now();

  it.each([
    [
      'should tick a reserved name that has not target but is expired',
      {
        reserved: {
          'expired-reserved-name': {
            endTimestamp: currentBlockTimestamp - 1,
          },
        },
      },
      {
        reserved: {},
      },
    ],
    [
      'should tick a reserved name that has a target but is expired',
      {
        reserved: {
          'expired-with-target': {
            endTimestamp: currentBlockTimestamp - 1,
            target: 'test-target',
          },
        },
      },
      {
        reserved: {},
      },
    ],
    [
      'should not tick a reserved name that has a target and is not expired',
      {
        reserved: {
          'not-expired-with-target': {
            endTimestamp: currentBlockTimestamp + 1,
            target: 'test-target',
          },
        },
      },
      {
        reserved: {
          'not-expired-with-target': {
            endTimestamp: currentBlockTimestamp + 1,
            target: 'test-target',
          },
        },
      },
    ],
    [
      'should not tick a reserved name that has no target and is not expired',
      {
        reserved: {
          'not-expired-no-target': {
            endTimestamp: currentBlockTimestamp + 1,
          },
        },
      },
      {
        reserved: {
          'not-expired-no-target': {
            endTimestamp: currentBlockTimestamp + 1,
          },
        },
      },
    ],
    [
      'should not tick a reserved name that has no target and no endTimestamp',
      {
        reserved: {
          'forever-reserved': {},
        },
      },
      {
        reserved: {
          'forever-reserved': {},
        },
      },
    ],
  ])('%s', (_, inputData, expectedData) => {
    const { reserved } = tickReservedNames({
      currentBlockTimestamp: new BlockTimestamp(currentBlockTimestamp),
      reservedNames: inputData.reserved as DeepReadonly<ReservedNames>,
    });
    expect(reserved).toEqual(expectedData.reserved);
  });
});
