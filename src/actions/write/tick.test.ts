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
  BAD_OBSERVER_GATEWAY_PENALTY,
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  INITIAL_DEMAND_FACTOR_DATA,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import {
  getEligibleGatewaysForEpoch,
  getPrescribedObserversForEpoch,
} from '../../observers';
import { updateDemandFactor } from '../../pricing';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedAuctionData,
  stubbedGatewayData,
  stubbedGateways,
} from '../../tests/stubs';
import {
  Auctions,
  Balances,
  BlockHeight,
  BlockTimestamp,
  DeepReadonly,
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

jest.mock('../../pricing', () => ({
  ...jest.requireActual('../../pricing'),
  updateDemandFactor: jest.fn().mockReturnValue({}),
}));

describe('tick', () => {
  beforeEach(() => {
    (getEligibleGatewaysForEpoch as jest.Mock).mockReturnValue(stubbedGateways);
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue(
      Object.keys(stubbedGateways).map((address: string) => {
        return {
          gatewayAddress: address,
          observerAddress: stubbedGateways[address].observerWallet,
          stake: 100,
          start: 0,
          stakeWeight: 10,
          tenureWeight: 1,
          gatewayRewardRatioWeight: 1,
          observerRewardRatioWeight: 1,
          compositeWeight: 1,
          normalizedCompositeWeight: 1,
        };
      }),
    );
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

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
            'tick-auction': {
              ...stubbedAuctionData,
              type: 'permabuy',
              endHeight: SmartWeave.block.height,
            },
          } as Auctions,
          records: {},
          demandFactoring: INITIAL_DEMAND_FACTOR_DATA,
        },
        {
          balances: {
            'some-other-balance': 1000,
            [SmartWeave.contract.id]: 1000 + stubbedAuctionData.floorPrice,
          } as Balances,
          auctions: {} as Auctions,
          records: {
            'tick-auction': {
              contractTxId: stubbedAuctionData.contractTxId,
              type: 'permabuy',
              startTimestamp: blockTimestamp,
              undernames: 10,
              purchasePrice: stubbedAuctionData.floorPrice, // the floor price
            },
          } as Records,
          demandFactoring: {
            ...INITIAL_DEMAND_FACTOR_DATA,
            purchasesThisPeriod: 1,
            revenueThisPeriod: stubbedAuctionData.floorPrice,
          },
        },
      ],
      [
        'should tick an auction for a leased name that has expired and add the floor price to a non-existent protocol balance',
        {
          balances: {
            'some-other-balance': 1000,
            // no protocol balance, we want to validate it gets created and incremented by the floor price
          } as Balances,
          auctions: {
            'tick-leased-auction': {
              ...stubbedAuctionData,
              type: 'lease',
              endHeight: SmartWeave.block.height,
              years: 1,
            },
          },
          records: {},
          demandFactoring: INITIAL_DEMAND_FACTOR_DATA,
        },
        {
          balances: {
            'some-other-balance': 1000,
            [SmartWeave.contract.id]: stubbedAuctionData.floorPrice,
          } as Balances,
          auctions: {},
          records: {
            'tick-leased-auction': {
              startTimestamp: blockTimestamp,
              undernames: 10,
              endTimestamp: blockTimestamp + SECONDS_IN_A_YEAR,
              type: 'lease',
              contractTxId: stubbedAuctionData.contractTxId,
              purchasePrice: stubbedAuctionData.floorPrice,
            },
          },
          demandFactoring: {
            ...INITIAL_DEMAND_FACTOR_DATA,
            purchasesThisPeriod: 1,
            revenueThisPeriod: stubbedAuctionData.floorPrice,
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
              ...stubbedAuctionData,
              endHeight: SmartWeave.block.height + 10,
            },
          },
          demandFactoring: INITIAL_DEMAND_FACTOR_DATA,
        },
        {
          balances: {
            'some-other-balance': 1000,
          } as Balances,
          auctions: {
            'do-not-tick': {
              ...stubbedAuctionData,
              endHeight: SmartWeave.block.height + 10,
            },
          },
          records: {},
          demandFactoring: INITIAL_DEMAND_FACTOR_DATA,
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
          currentBlockHeight: new BlockHeight(SmartWeave.block.height + 1),
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
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
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
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
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
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
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
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
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
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
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
    it('should not distribute rewards when protocol balance is 0, but should update epoch distribution values and increment gateway performance stats', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 0,
        },
        gateways: stubbedGateways,
      };
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(
            initialState.distributions.epochDistributionHeight,
          ),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
        });
      expect(balances).toEqual(initialState.balances);
      expect(distributions).toEqual({
        epochZeroStartHeight: initialState.distributions.epochZeroStartHeight,
        epochStartHeight: initialState.distributions.epochEndHeight + 1,
        epochEndHeight:
          initialState.distributions.epochEndHeight + EPOCH_BLOCK_LENGTH,
        epochDistributionHeight:
          initialState.distributions.epochDistributionHeight +
          EPOCH_BLOCK_LENGTH,
      });
      const expectedGateways = Object.keys(stubbedGateways).reduce(
        (acc: Gateways, gatewayAddress: string) => {
          acc[gatewayAddress] = {
            ...stubbedGateways[gatewayAddress],
            stats: {
              submittedEpochCount: 0,
              passedEpochCount: 0,
              failedConsecutiveEpochs: 0,
              totalEpochsPrescribedCount: 1,
              totalEpochParticipationCount: 1,
            },
          };
          return acc;
        },
        {},
      );
      expect(gateways).toEqual(expectedGateways);
    });
  });

  it('should not distribute rewards, increment gateway performance stats or update epoch values if the current block height is not greater than or equal to the distribution height', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
      gateways: stubbedGateways,
    };
    const { balances, distributions, gateways } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(
        initialState.distributions.epochDistributionHeight - 1,
      ),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
    });
    expect(balances).toEqual(initialState.balances);
    expect(distributions).toEqual(initialState.distributions);
    expect(gateways).toEqual(initialState.gateways);
  });

  it.each([0, EPOCH_DISTRIBUTION_DELAY - 1])(
    'should not distribute rewards or increment gateway stats and epoch values if the current block height is equal to the last epoch end height + %s blocks',
    async (blockHeight) => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 10_000_000,
        },
        gateways: stubbedGateways,
      };
      const firstEpochEndHeight =
        initialState.distributions.epochZeroStartHeight +
        EPOCH_BLOCK_LENGTH -
        1;
      const invalidBlockHeight = firstEpochEndHeight + blockHeight;
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(invalidBlockHeight),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
        });
      expect(balances).toEqual(initialState.balances);
      expect(distributions).toEqual(initialState.distributions);
      expect(gateways).toEqual(initialState.gateways);
    },
  );

  // TODO: update this
  it('should not distribute rewards if there are no gateways or observers in the GAR, but update epoch values', async () => {
    // stub these so they don't return anything
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([]);
    (getEligibleGatewaysForEpoch as jest.Mock).mockReturnValue({});
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
    };
    const { balances, distributions, gateways } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(
        initialState.distributions.epochEndHeight + EPOCH_DISTRIBUTION_DELAY,
      ),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
    });
    const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
    const expectedNewEpochEndHeight =
      expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
    expect(balances).toEqual(initialState.balances);
    expect(distributions).toEqual({
      ...initialState.distributions,
      epochStartHeight: expectedNewEpochStartHeight,
      epochEndHeight: expectedNewEpochEndHeight,
      epochDistributionHeight:
        expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
    });
    expect(gateways).toEqual(initialState.gateways);
  });

  it('should not distribute rewards if no observations were submitted, but should update epoch counts for gateways and the distribution epoch values', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
      gateways: stubbedGateways,
      observations: {},
    };
    const { balances, distributions, gateways } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(
        initialState.distributions.epochDistributionHeight,
      ),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
    });
    expect(balances).toEqual({
      ...initialState.balances,
    });
    const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
    const expectedNewEpochEndHeight =
      expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
    expect(distributions).toEqual({
      ...initialState.distributions,
      epochStartHeight: expectedNewEpochStartHeight,
      epochEndHeight: expectedNewEpochEndHeight,
      epochDistributionHeight:
        expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
    });
    const expectedGateways = Object.keys(stubbedGateways).reduce(
      (acc: Gateways, gatewayAddress: string) => {
        acc[gatewayAddress] = {
          ...stubbedGateways[gatewayAddress],
          stats: {
            submittedEpochCount: 0,
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochsPrescribedCount: 1,
            totalEpochParticipationCount: 1,
          },
        };
        return acc;
      },
      {},
    );
    expect(gateways).toEqual(expectedGateways);
  });

  it('should distribute rewards to observers who submitted reports and gateways who passed, update distribution epoch values and increment performance stats', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: 10_000_000,
      },
      gateways: stubbedGateways,
      observations: {
        0: {
          failureSummaries: {
            // one failure, but not more than half so still gets the reward, is penalized for not submitting a report
            'a-gateway-2': ['a-gateway'],
            // gateway-3 is failing more according to more than half the gateways, no gateway reward
            'a-gateway-3': ['a-gateway', 'a-gateway-3'],
          },
          reports: {
            // gateway-1 and gateway-3 get a full observer reward
            [stubbedGateways['a-gateway'].observerWallet]: stubbedArweaveTxId,
            [stubbedGateways['a-gateway-3'].observerWallet]: stubbedArweaveTxId,
            // gateway-2 did not submit a report
          },
        },
      },
    };
    const epochDistributionHeight =
      initialState.distributions.epochDistributionHeight;
    const { balances, distributions, gateways } = await tickRewardDistribution({
      currentBlockHeight: new BlockHeight(epochDistributionHeight),
      gateways: initialState.gateways,
      balances: initialState.balances,
      distributions: initialState.distributions,
      observations: initialState.observations,
    });
    const totalRewardsEligible = 10_000_000 * 0.0025;
    const totalObserverReward = totalRewardsEligible * 0.05; // 5% of the total distributions
    const totalGatewayReward = totalRewardsEligible - totalObserverReward; // 95% of total distribution
    const perObserverReward = Math.floor(totalObserverReward / 3); // 3 observers
    const perGatewayReward = Math.floor(totalGatewayReward / 3); // 3 gateways
    const goodObserverAndGatewayReward = perObserverReward + perGatewayReward;
    const goodObserverBadGatewayReward = perObserverReward;
    const badObserverGoodGatewayReward =
      perGatewayReward * (1 - BAD_OBSERVER_GATEWAY_PENALTY);
    const totalRewardsDistributed =
      goodObserverAndGatewayReward +
      goodObserverBadGatewayReward +
      badObserverGoodGatewayReward;
    expect(balances).toEqual({
      ...initialState.balances,
      'a-gateway': goodObserverAndGatewayReward, // gets observer and gateway reward
      'a-gateway-2': badObserverGoodGatewayReward, // gets gateway reward, but penalized for not submitting a report
      'a-gateway-3': goodObserverBadGatewayReward, // gets observer reward, but no gateway reward
      [SmartWeave.contract.id]: 10_000_000 - totalRewardsDistributed,
    });
    const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
    const expectedNewEpochEndHeight =
      expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
    expect(distributions).toEqual({
      ...initialState.distributions,
      epochStartHeight: expectedNewEpochStartHeight,
      epochEndHeight: expectedNewEpochEndHeight,
      epochDistributionHeight:
        expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
    });
    expect(gateways).toEqual({
      ...initialState.gateways,
      'a-gateway': {
        ...initialState.gateways['a-gateway'],
        stats: {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 1,
          passedEpochCount: 1,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 1,
        },
      },
      'a-gateway-2': {
        ...initialState.gateways['a-gateway-2'],
        stats: {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 0,
          passedEpochCount: 1,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 1,
        },
      },
      'a-gateway-3': {
        ...initialState.gateways['a-gateway-3'],
        stats: {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 1,
          passedEpochCount: 0,
          failedConsecutiveEpochs: 1,
          totalEpochParticipationCount: 1,
        },
      },
    });
  });

  // top level tests
  it('should tick distributions and update gateway performance stats if a the interaction height is equal to the epochDistributionHeight', async () => {
    const initialState: IOState = {
      ...getBaselineState(),
      gateways: stubbedGateways,
    };

    // stub the demand factor change
    (updateDemandFactor as jest.Mock).mockReturnValue(initialState);

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
          initialState.distributions.epochStartHeight + EPOCH_BLOCK_LENGTH,
        epochEndHeight:
          initialState.distributions.epochEndHeight + EPOCH_BLOCK_LENGTH,
        epochDistributionHeight:
          initialState.distributions.epochEndHeight +
          EPOCH_BLOCK_LENGTH +
          EPOCH_DISTRIBUTION_DELAY,
      },
      gateways: {
        ...initialState.gateways,
        'a-gateway': {
          ...initialState.gateways['a-gateway'],
          stats: {
            totalEpochsPrescribedCount: 1,
            submittedEpochCount: 0,
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 1,
          },
        },
        'a-gateway-2': {
          ...initialState.gateways['a-gateway-2'],
          stats: {
            totalEpochsPrescribedCount: 1,
            submittedEpochCount: 0,
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 1,
          },
        },
        'a-gateway-3': {
          ...initialState.gateways['a-gateway-3'],
          stats: {
            totalEpochsPrescribedCount: 1,
            submittedEpochCount: 0,
            passedEpochCount: 0,
            failedConsecutiveEpochs: 0,
            totalEpochParticipationCount: 1,
          },
        },
      },
    });
  });
});
