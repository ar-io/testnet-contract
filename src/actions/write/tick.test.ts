import {
  tick,
  tickAuctions,
  tickGatewayRegistry,
  tickRecords,
  tickReservedNames,
  tickRewardDistribution,
  tickVaults,
} from '../../actions/write/tick';
import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  TALLY_PERIOD_BLOCKS,
} from '../../constants';
import {
  getEligibleGatewaysForEpoch,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  baselineGatewayData,
  getBaselineState,
  stubbedArweaveTxId, // stubbedArweaveTxId,
} from '../../tests/stubs';
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

jest.mock('../../observers', () => ({
  ...jest.requireActual('../../observers'),
  getPrescribedObserversForEpoch: jest.fn().mockResolvedValue([]),
  getEligibleGatewaysForEpoch: jest.fn().mockResolvedValue({}),
}));

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
            delegatedStake: 0,
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
            delegates: {},
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
            delegatedStake: 0,
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
            delegates: {},
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
            delegatedStake: 0,
            observerWallet: 'existing-operator',
            start: 0,
            end: 10,
            vaults: {},
            delegates: {},
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
            delegatedStake: 0,
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
            delegates: {},
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
            delegatedStake: 0,
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
            delegates: {},
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

describe('tickRewardDistribution', () => {
  beforeEach(() => {
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([
      {
        gatewayAddress: 'a-gateway',
        observerAddress: 'an-observing-gateway',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: 1,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
      },
      {
        gatewayAddress: 'a-gateway-2',
        observerAddress: 'an-observing-gateway-2',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: 1,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
      },
      {
        gatewayAddress: 'a-gateway-3',
        observerAddress: 'an-observing-gateway-3',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: 1,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
      },
    ]);
    (getEligibleGatewaysForEpoch as jest.Mock).mockReturnValue({
      'a-gateway': {
        ...baselineGatewayData,
        observerWallet: 'an-observing-gateway',
      },
      'a-gateway-2': {
        ...baselineGatewayData,
        observerWallet: 'an-observing-gateway-2',
      },
      'a-gateway-3': {
        ...baselineGatewayData,
        observerWallet: 'an-observing-gateway-3',
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should not distribute rewards when protocol balance is 0, but should update epoch distribution values', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 0,
      },
    };
    const { balances, distributions } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(
        initialState.distributions.epochDistributionHeight,
      ),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
      settings: initialState.settings,
    });
    expect(balances).toEqual(initialState.balances);
    expect(distributions).toEqual({
      epochZeroStartHeight: initialState.distributions.epochZeroStartHeight,
      epochStartHeight: initialState.distributions.epochEndHeight + 1,
      epochEndHeight:
        initialState.distributions.epochEndHeight + DEFAULT_EPOCH_BLOCK_LENGTH,
      epochDistributionHeight:
        initialState.distributions.epochDistributionHeight +
        DEFAULT_EPOCH_BLOCK_LENGTH,
      gateways: {
        'a-gateway': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
        },
        'a-gateway-2': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
        },
        'a-gateway-3': {
          failedConsecutiveEpochs: 0,
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
        },
      },
      observers: {
        'an-observing-gateway': {
          submittedEpochCount: 0,
          totalEpochsPrescribedCount: 1,
        },
        'an-observing-gateway-2': {
          submittedEpochCount: 0,
          totalEpochsPrescribedCount: 1,
        },
        'an-observing-gateway-3': {
          submittedEpochCount: 0,
          totalEpochsPrescribedCount: 1,
        },
      },
    });
  });

  it('should not distribute rewards or update distribution values if the current block height is not greater than or equal to the distribution height', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
    };
    const { balances, distributions } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(
        initialState.distributions.epochDistributionHeight - 1,
      ),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
      settings: initialState.settings,
    });
    expect(balances).toEqual(initialState.balances);
    expect(distributions).toEqual(initialState.distributions);
  });

  it.each([0, TALLY_PERIOD_BLOCKS - 1])(
    'should not distribute rewards if the current block height is equal to the last epoch end height + %s blocks',
    async (blockHeight) => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 10_000_000,
        },
      };
      const firstEpochEndHeight =
        initialState.distributions.epochZeroStartHeight +
        DEFAULT_EPOCH_BLOCK_LENGTH -
        1;
      const invalidBlockHeight = firstEpochEndHeight + blockHeight;
      const { balances, distributions } = await tickRewardDistribution({
        currentBlockHeight: new BlockHeight(invalidBlockHeight),
        gateways: initialState.gateways,
        balances: initialState.balances,
        distributions: initialState.distributions,
        observations: initialState.observations,
        settings: initialState.settings,
      });
      expect(balances).toEqual(initialState.balances);
      expect(distributions).toEqual(initialState.distributions);
    },
  );

  it('should not distribute rewards if there are no gateways or observers in the GAR, but update distributions values for the epoch', async () => {
    // both of these return empty objects
    (getEligibleGatewaysForEpoch as jest.Mock).mockReturnValue({});
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([]);
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
    };
    const { balances, distributions } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(
        initialState.distributions.epochEndHeight + TALLY_PERIOD_BLOCKS,
      ),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
      settings: initialState.settings,
    });
    const expectedNewEpochStartHeight = DEFAULT_EPOCH_BLOCK_LENGTH;
    const expectedNewEpochEndHeight =
      expectedNewEpochStartHeight + DEFAULT_EPOCH_BLOCK_LENGTH - 1;
    expect(balances).toEqual(initialState.balances);
    expect(distributions).toEqual({
      ...initialState.distributions,
      epochStartHeight: expectedNewEpochStartHeight,
      epochEndHeight: expectedNewEpochEndHeight,
      epochDistributionHeight: expectedNewEpochEndHeight + TALLY_PERIOD_BLOCKS,
    });
  });

  it('should not distribute rewards if no reports were submitted, but should update epoch counts for gateways and the distribution epoch values', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
      gateways: {
        'a-gateway': {
          ...baselineGatewayData,
          observerWallet: 'an-observing-gateway',
        },
        'a-gateway-2': {
          ...baselineGatewayData,
          observerWallet: 'an-observing-gateway-2',
        },
        'a-gateway-3': {
          ...baselineGatewayData,
          observerWallet: 'an-observing-gateway-3',
        },
      },
      observations: {},
    };
    const epochDistributionHeight =
      initialState.distributions.epochDistributionHeight;
    const { balances, distributions } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(epochDistributionHeight),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
      settings: initialState.settings,
    });
    expect(balances).toEqual({
      ...initialState.balances,
    });
    const expectedNewEpochStartHeight = DEFAULT_EPOCH_BLOCK_LENGTH;
    const expectedNewEpochEndHeight =
      expectedNewEpochStartHeight + DEFAULT_EPOCH_BLOCK_LENGTH - 1;
    expect(distributions).toEqual({
      ...initialState.distributions,
      epochStartHeight: expectedNewEpochStartHeight,
      epochEndHeight: expectedNewEpochEndHeight,
      epochDistributionHeight: expectedNewEpochEndHeight + TALLY_PERIOD_BLOCKS,
      gateways: {
        'a-gateway': {
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
          failedConsecutiveEpochs: 0,
        },
        'a-gateway-2': {
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
          failedConsecutiveEpochs: 0,
        },
        'a-gateway-3': {
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
          failedConsecutiveEpochs: 0,
        },
      },
      observers: {
        'an-observing-gateway': {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 0,
        },
        'an-observing-gateway-2': {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 0,
        },
        'an-observing-gateway-3': {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 0,
        },
      },
    });
  });

  it('should distribute rewards to observers who submitted reports and gateways who passed and update distribution epoch values', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
      gateways: {
        'a-gateway': {
          ...baselineGatewayData,
          observerWallet: 'an-observing-gateway',
        },
        'a-gateway-2': {
          ...baselineGatewayData,
          observerWallet: 'an-observing-gateway-2',
        },
        'a-gateway-3': {
          ...baselineGatewayData,
          observerWallet: 'an-observing-gateway-3',
        },
      },
      observations: {
        0: {
          failureSummaries: {
            // one failure, but not more than half so still gets the reward
            'a-gateway-2': ['an-observing-gateway'],
            // observer 3 is failing more according to more than half the gateways
            'a-gateway-3': ['an-observing-gateway', 'an-observing-gateway-2'],
          },
          // all will get observer reward
          reports: {
            'an-observing-gateway': stubbedArweaveTxId,
            'an-observing-gateway-2': stubbedArweaveTxId,
            // observer 3 did not submit a report
          },
        },
      },
    };
    const epochDistributionHeight =
      initialState.distributions.epochDistributionHeight;
    const { balances, distributions } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(epochDistributionHeight),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
      settings: initialState.settings,
    });
    const totalRewardsEligible = 10_000_000 * 0.0025;
    const totalObserverReward = totalRewardsEligible * 0.05; // 5% of the total distributions
    const perObserverReward = Math.floor(totalObserverReward / 3); // 3 observers
    const totalGatewayReward = totalRewardsEligible - totalObserverReward; // 95% of total distribution
    const perGatewayReward = Math.floor(totalGatewayReward / 3); // 3 gateways
    const totalRewardsDistributed =
      perObserverReward * 2 + perGatewayReward * 2; // only two get both
    expect(balances).toEqual({
      ...initialState.balances,
      'a-gateway': perObserverReward + perGatewayReward,
      'a-gateway-2': perObserverReward + perGatewayReward,
      // observer three does not get anything!
      [SmartWeave.contract.id]: 10_000_000 - totalRewardsDistributed,
    });
    const expectedNewEpochStartHeight = DEFAULT_EPOCH_BLOCK_LENGTH;
    const expectedNewEpochEndHeight =
      expectedNewEpochStartHeight + DEFAULT_EPOCH_BLOCK_LENGTH - 1;
    expect(distributions).toEqual({
      ...initialState.distributions,
      epochStartHeight: expectedNewEpochStartHeight,
      epochEndHeight: expectedNewEpochEndHeight,
      epochDistributionHeight: expectedNewEpochEndHeight + TALLY_PERIOD_BLOCKS,
      gateways: {
        'a-gateway': {
          passedEpochCount: 1,
          totalEpochParticipationCount: 1,
          failedConsecutiveEpochs: 0,
        },
        'a-gateway-2': {
          passedEpochCount: 1,
          totalEpochParticipationCount: 1,
          failedConsecutiveEpochs: 0,
        },
        'a-gateway-3': {
          passedEpochCount: 0,
          totalEpochParticipationCount: 1,
          failedConsecutiveEpochs: 1,
        },
      },
      observers: {
        'an-observing-gateway': {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 1,
        },
        'an-observing-gateway-2': {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 1,
        },
        'an-observing-gateway-3': {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 0,
        },
      },
    });
  });
});

describe('top level tick', () => {
  beforeAll(() => {
    (getEligibleGatewaysForEpoch as jest.Mock).mockReturnValue({
      'a-gateway': {
        ...baselineGatewayData,
        observerWallet: 'an-observing-gateway',
      },
      'a-gateway-2': {
        ...baselineGatewayData,
        observerWallet: 'an-observing-gateway-2',
      },
      'a-gateway-3': {
        ...baselineGatewayData,
        observerWallet: 'an-observing-gateway-3',
      },
    });
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([
      {
        gatewayAddress: 'a-gateway',
        observerAddress: 'an-observing-gateway',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: 1,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
      },
      {
        gatewayAddress: 'a-gateway-2',
        observerAddress: 'an-observing-gateway-2',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: 1,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
      },
      {
        gatewayAddress: 'a-gateway-3',
        observerAddress: 'an-observing-gateway-3',
        stake: 100,
        start: 0,
        stakeWeight: 10,
        tenureWeight: 1,
        gatewayRewardRatioWeight: 1,
        observerRewardRatioWeight: 1,
        compositeWeight: 1,
        normalizedCompositeWeight: 1,
      },
    ]);
  });

  it('should tick distributions if a the interaction height is equal to the epochDistributionHeight', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
    };

    // update our state
    SmartWeave.block.height =
      initialState.distributions.epochDistributionHeight;

    const { state } = await tick(initialState);

    expect(state).toEqual({
      ...initialState,
      lastTickedHeight: initialState.distributions.epochDistributionHeight,
      distributions: {
        ...initialState.distributions,
        epochStartHeight:
          initialState.distributions.epochStartHeight +
          DEFAULT_EPOCH_BLOCK_LENGTH,
        epochEndHeight:
          initialState.distributions.epochEndHeight +
          DEFAULT_EPOCH_BLOCK_LENGTH,
        epochDistributionHeight:
          initialState.distributions.epochEndHeight +
          DEFAULT_EPOCH_BLOCK_LENGTH +
          TALLY_PERIOD_BLOCKS,
        gateways: {
          'a-gateway': {
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 1,
          },
          'a-gateway-2': {
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 1,
          },
          'a-gateway-3': {
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 1,
          },
        },
        observers: {
          'an-observing-gateway': {
            totalEpochsPrescribedCount: 1,
            submittedEpochCount: 0,
          },
          'an-observing-gateway-2': {
            totalEpochsPrescribedCount: 1,
            submittedEpochCount: 0,
          },
          'an-observing-gateway-3': {
            totalEpochsPrescribedCount: 1,
            submittedEpochCount: 0,
          },
        },
      },
    });
  });
});
