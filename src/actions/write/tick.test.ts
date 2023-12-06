import {
  tickAuctions,
  tickGatewayRegistry,
  tickRecords,
  tickReservedNames,
  tickVaults,
} from '../../actions/write/tick';
import { SECONDS_IN_A_YEAR, SECONDS_IN_GRACE_PERIOD } from '../../constants';
import {
  ArNSPermabuyAuctionData,
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
  DemandFactoringData,
  GatewaySettings,
  Gateways,
  IOState,
  Records,
  RegistryVaults,
  ReservedNames,
} from '../../types';

const defaultAuctionSettings = {
  auctionDuration: 2,
  scalingExponent: 10,
  exponentialDecayRate: 0.5,
  floorPriceMultiplier: 1,
  startPriceMultiplier: 10,
};

const testAuction: ArNSPermabuyAuctionData = {
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
      'should tick an auction for a permabuy name that has expired and add the floor price to an existing protocol balance',
      {
        balances: {
          'some-other-balance': 1000,
          [SmartWeave.contract.id]: 1000, // we want to validate this gets incremented by the floor price
        } as Balances,
        auctions: {
          'tick-auction': testAuction,
        } as Auctions,
        records: {},
        demandFactoring: demandFactorData,
      },
      {
        balances: {
          'some-other-balance': 1000,
          [SmartWeave.contract.id]: 1000 + testAuction.floorPrice,
        } as Balances,
        auctions: {} as Auctions,
        records: {
          'tick-auction': {
            contractTxId: 'test-tx-id',
            type: 'permabuy',
            startTimestamp: blockTimestamp,
            undernames: 10,
            purchasePrice: 10, // the floor price
          },
        } as Records,
        demandFactoring: {
          ...demandFactorData,
          purchasesThisPeriod: 1,
          revenueThisPeriod: 10,
        },
      },
    ],
    [
      'should tick an auction for a leased name that has expired and add the floor price to a non-existent protocol balance',
      {
        balances: {
          'some-other-balance': 1000,
          // not protocol balance, we want to validate it gets created and incremented by the floor price
        } as Balances,
        auctions: {
          'tick-leased-auction': {
            ...testAuction,
            type: 'lease',
            years: 1,
          },
        },
        records: {},
        demandFactoring: demandFactorData,
      },
      {
        balances: {
          'some-other-balance': 1000,
          [SmartWeave.contract.id]: testAuction.floorPrice,
        } as Balances,
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
          ...demandFactorData,
          purchasesThisPeriod: 1,
          revenueThisPeriod: 10,
        },
      },
    ],
    [
      'should not tick an auction that has not expired yet',
      {
        balances: {
          'some-other-balance': 1000,
        } as Balances,
        auctions: {
          'do-not-tick': {
            ...testAuction,
            endHeight: 10,
          },
        },
        demandFactoring: demandFactorData,
      },
      {
        balances: {
          'some-other-balance': 1000,
        } as Balances,
        auctions: {
          'do-not-tick': {
            ...testAuction,
            endHeight: 10,
          },
        },
        records: {},
        demandFactoring: demandFactorData,
      },
    ],
  ])(
    '%s',
    (
      _: string,
      inputData: Pick<
        IOState,
        'balances' | 'auctions' | 'records' | 'demandFactoring'
      >,
      expectedData: Pick<
        IOState,
        'balances' | 'auctions' | 'records' | 'demandFactoring'
      >,
    ) => {
      const { auctions, records, balances, demandFactoring } = tickAuctions({
        currentBlockHeight: new BlockHeight(5),
        currentBlockTimestamp: new BlockTimestamp(blockTimestamp),
        records: {},
        balances: inputData.balances,
        auctions: inputData.auctions,
        demandFactoring: inputData.demandFactoring,
      });
      expect(balances).toEqual(expectedData.balances);
      expect(auctions).toEqual(expectedData.auctions);
      expect(records).toEqual(expectedData.records);
      expect(demandFactoring).toEqual({
        ...inputData.demandFactoring,
        ...expectedData.demandFactoring,
      });
    },
  );
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
            vaults: {
              'existing-vault-id': {
                balance: 100,
                start: 0,
                end: 10,
              },
            },
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
            vaults: {
              'existing-vault-id': {
                balance: 100,
                start: 0,
                end: 2,
              },
            },
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
            vaults: {},
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
            vaults: {
              'existing-vault-id': {
                balance: 100,
                start: 0,
                end: 10,
              },
            },
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
            vaults: {
              'existing-vault-id': {
                balance: 100,
                start: 0,
                end: 10,
              },
            },
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

describe('tickVaults', () => {
  it('should not make changes when vaults are not present', () => {
    const currentBlockHeight = new BlockHeight(5);
    const vaults: RegistryVaults = {};
    const balances = { foo: 1, bar: 2 };
    const { vaults: updatedVaults, balances: updatedBalances } = tickVaults({
      currentBlockHeight,
      balances,
      vaults,
    });
    expect(updatedBalances).toEqual({ foo: 1, bar: 2 });
    expect(updatedVaults).toEqual({});
  });

  it('should not unlock single vault if it has not ended', () => {
    const currentBlockHeight = new BlockHeight(5);
    const address = 'bar';
    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
    };
    const balances = { foo: 1, bar: 2 };
    const { vaults: updatedVaults, balances: updatedBalances } = tickVaults({
      currentBlockHeight,
      balances,
      vaults,
    });
    expect(updatedBalances).toEqual({ foo: 1, bar: 2 });
    expect(updatedVaults[address]).toEqual(vaults[address]);
  });

  it('should not unlock multiple vaults if they have not ended', () => {
    const currentBlockHeight = new BlockHeight(5);
    const vaults: RegistryVaults = {
      ['foo']: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
      },
      ['bar']: {
        'other-existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
        'another-existing-vault-id-2': {
          balance: 2,
          end: 100,
          start: 0,
        },
      },
      ['baz']: {
        'existing-vault-id': {
          balance: 1,
          end: 100,
          start: 0,
        },
        'other-existing-vault-id': {
          balance: 2,
          end: 100,
          start: 0,
        },
        'another-existing-vault-id-2': {
          balance: 3,
          end: 100,
          start: 0,
        },
      },
    };
    const balances = { foo: 1, bar: 2, baz: 3 };
    const { vaults: updatedVaults, balances: updatedBalances } = tickVaults({
      currentBlockHeight,
      balances,
      vaults,
    });
    expect(updatedBalances).toEqual({ foo: 1, bar: 2, baz: 3 });
    expect(updatedVaults['foo']).toEqual(vaults['foo']);
    expect(updatedVaults['bar']).toEqual(vaults['bar']);
    expect(updatedVaults['baz']).toEqual(vaults['baz']);
  });

  it('should unlock single vault when it is ended', () => {
    const currentBlockHeight = new BlockHeight(6);
    const address = 'bar';
    const vaults: RegistryVaults = {
      [address]: {
        'existing-vault-id': {
          balance: 1,
          end: 5,
          start: 0,
        },
      },
    };
    const balances = { foo: 1, bar: 2 };
    const { vaults: updatedVaults, balances: updatedBalances } = tickVaults({
      currentBlockHeight,
      balances,
      vaults,
    });
    expect(updatedVaults[address]).toEqual(undefined);
    expect(updatedBalances).toEqual({ foo: 1, bar: 3 });
  });

  it('should unlock multiple vaults if they have ended', () => {
    const currentBlockHeight = new BlockHeight(0);
    const vaults: RegistryVaults = {
      ['foo']: {
        'existing-vault-id': {
          balance: 1,
          end: 0,
          start: 0,
        },
      },
      ['bar']: {
        'other-existing-vault-id': {
          balance: 1,
          end: 0,
          start: 0,
        },
        'another-existing-vault-id-2': {
          balance: 2,
          end: 100,
          start: 0,
        },
      },
      ['baz']: {
        'existing-vault-id': {
          balance: 1,
          end: 0,
          start: 0,
        },
        'other-existing-vault-id': {
          balance: 2,
          end: 0,
          start: 0,
        },
        'another-existing-vault-id-2': {
          balance: 3,
          end: 100,
          start: 0,
        },
      },
    };
    const balances = { foo: 1, bar: 2, baz: 3 };
    const { vaults: updatedVaults, balances: updatedBalances } = tickVaults({
      currentBlockHeight,
      balances,
      vaults,
    });
    expect(updatedBalances).toEqual({ foo: 2, bar: 3, baz: 6 });
    expect(updatedVaults['foo']).toEqual(undefined);
    expect(updatedVaults['bar']).toEqual({
      'another-existing-vault-id-2': {
        balance: 2,
        end: 100,
        start: 0,
      },
    });
    expect(updatedVaults['baz']).toEqual({
      'another-existing-vault-id-2': {
        balance: 3,
        end: 100,
        start: 0,
      },
    });
  });

  it('should unlock all vaults if they have ended', () => {
    const currentBlockHeight = new BlockHeight(0);
    const vaults: RegistryVaults = {
      ['foo']: {
        'existing-vault-id': {
          balance: 1,
          end: 0,
          start: 0,
        },
      },
      ['bar']: {
        'other-existing-vault-id': {
          balance: 1,
          end: 0,
          start: 0,
        },
        'another-existing-vault-id-2': {
          balance: 2,
          end: 0,
          start: 0,
        },
      },
      ['baz']: {
        'existing-vault-id': {
          balance: 1,
          end: 0,
          start: 0,
        },
        'other-existing-vault-id': {
          balance: 2,
          end: 0,
          start: 0,
        },
        'another-existing-vault-id-2': {
          balance: 3,
          end: 0,
          start: 0,
        },
      },
    };
    const balances = { foo: 1, bar: 2, baz: 3 };
    const { vaults: updatedVaults, balances: updatedBalances } = tickVaults({
      currentBlockHeight,
      balances,
      vaults,
    });
    expect(updatedBalances).toEqual({ foo: 2, bar: 5, baz: 9 });
    expect(updatedVaults['foo']).toEqual(undefined);
    expect(updatedVaults['bar']).toEqual(undefined);
    expect(updatedVaults['baz']).toEqual(undefined);
  });
});
