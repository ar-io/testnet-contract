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
  EPOCH_REWARD_PERCENTAGE,
  GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
  INITIAL_DEMAND_FACTOR_DATA,
  MIN_DELEGATED_STAKE,
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
  stubbedDelegateData,
  stubbedDelegatedGatewayData,
  stubbedGatewayData,
  stubbedGateways,
  stubbedPrescribedObserver,
  stubbedPrescribedObservers,
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
              totalDelegatedStake: 100,
              observerWallet: 'existing-operator',
              start: 0,
              end: 5,
              vaults: {
                'existing-vault-id': {
                  balance: 100,
                  start: 0,
                  end: 5,
                },
              },
              delegates: {
                'existing-delegate': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 5,
                    },
                  },
                },
              },
              status: 'leaving',
              settings: stubbedDelegatedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
            },
          },
          balances: {
            'leaving-operator': 0,
            'existing-delegate': 0,
          },
        },
        {
          gateways: {},
          balances: {
            'leaving-operator': 200,
            'existing-delegate': 200,
          },
        },
      ],
      [
        'should keep a gateway that is joined, but return any vaults that have expired',
        {
          gateways: {
            'existing-operator': {
              operatorStake: 100,
              totalDelegatedStake: 100,
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
              delegates: {
                'existing-delegate': {
                  delegatedStake: 0,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 2,
                    },
                    'existing-vault-id-2': {
                      balance: 100,
                      start: 0,
                      end: 2,
                    },
                  },
                },
                'existing-delegate-2': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                  },
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
              totalDelegatedStake: 100,
              observerWallet: 'existing-operator',
              start: 0,
              end: 10,
              vaults: {},
              delegates: {
                'existing-delegate-2': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                  },
                },
              },
              status: 'joined',
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
            },
          },
          balances: {
            'existing-operator': 100,
            'existing-delegate': 200,
          },
        },
      ],
      [
        'should keep a gateway that is joined and not return any vaults that have not yet expired',
        {
          gateways: {
            'existing-operator': {
              operatorStake: 100,
              totalDelegatedStake: 200,
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
              delegates: {
                'existing-delegate': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                    'existing-vault-id-2': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                  },
                },
                'existing-delegate-2': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                  },
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
              totalDelegatedStake: 200,
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
              delegates: {
                'existing-delegate': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                    'existing-vault-id-2': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                  },
                },
                'existing-delegate-2': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 20,
                    },
                  },
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
      [
        'should keep a gateway that is joined and only return delegate vaults that have expired',
        {
          gateways: {
            'existing-operator': {
              operatorStake: 100,
              totalDelegatedStake: 200,
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
              delegates: {
                'existing-delegate': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 2,
                    },
                    'existing-vault-id-2': {
                      balance: 100,
                      start: 0,
                      end: 2,
                    },
                  },
                },
                'existing-delegate-2': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {
                    'existing-vault-id': {
                      balance: 100,
                      start: 0,
                      end: 2,
                    },
                  },
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
              totalDelegatedStake: 200,
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
              delegates: {
                'existing-delegate': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {},
                },
                'existing-delegate-2': {
                  delegatedStake: 100,
                  start: 0,
                  vaults: {},
                },
              },
              status: 'joined',
              settings: stubbedGatewayData.settings,
              stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
            },
          },
          balances: {
            'existing-operator': 0,
            'existing-delegate': 200,
            'existing-delegate-2': 100,
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
    it('should not distribute rewards when protocol balance is 0, but should update epoch distribution values and increment gateway performance stats and update prescribed observers', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 0,
        },
        gateways: stubbedGateways,
        prescribedObservers: {
          [0]: stubbedPrescribedObservers,
        },
      };
      const { balances, distributions, gateways, prescribedObservers } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(
            initialState.distributions.nextDistributionHeight,
          ),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
        });
      expect(balances).toEqual(initialState.balances);
      expect(distributions).toEqual({
        epochZeroStartHeight: initialState.distributions.epochZeroStartHeight,
        epochStartHeight: initialState.distributions.epochEndHeight + 1,
        epochEndHeight:
          initialState.distributions.epochEndHeight + EPOCH_BLOCK_LENGTH,
        nextDistributionHeight:
          initialState.distributions.nextDistributionHeight +
          EPOCH_BLOCK_LENGTH,
        epochPeriod: initialState.distributions.epochPeriod + 1,
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
      expect(prescribedObservers).toEqual({
        [initialState.distributions.epochEndHeight + 1]: Object.keys(
          stubbedGateways,
        ).map((gatewayAddress: string) => {
          return {
            // updated weights based on the new epoch
            ...stubbedPrescribedObserver,
            gatewayAddress,
            observerAddress: stubbedGateways[gatewayAddress].observerWallet,
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
      });
    });

    it('should not distribute rewards, increment gateway performance stats or update epoch values if the current block height is not the epoch distribution height', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 10_000_000,
        },
        gateways: stubbedGateways,
      };
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(
            initialState.distributions.epochEndHeight,
          ),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
        });
      expect(balances).toEqual(initialState.balances);
      expect(distributions).toEqual(initialState.distributions);
      expect(gateways).toEqual(initialState.gateways);
    });

    it.each(
      // cheap way to dynamically generate all the blocks between the epochEndHeight and epochDistributionHeight
      Array.from({ length: EPOCH_DISTRIBUTION_DELAY - 1 }, (_, index) => ({
        index: index + 1,
      })),
    )(
      'should not distribute rewards or increment gateway stats, update prescribed observers or modify state the current block height is equal to the last epoch end height + %s blocks',
      async ({ index: blockHeightDiff }) => {
        const initialState: IOState = {
          ...getBaselineState(),
          balances: {
            [SmartWeave.contract.id]: 10_000_000,
          },
          gateways: stubbedGateways,
        };
        const { balances, distributions, gateways } =
          await tickRewardDistribution({
            currentBlockHeight: new BlockHeight(
              initialState.distributions.epochEndHeight + blockHeightDiff,
            ),
            gateways: initialState.gateways,
            balances: initialState.balances,
            distributions: initialState.distributions,
            observations: initialState.observations,
            prescribedObservers: initialState.prescribedObservers,
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
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(
            initialState.distributions.epochEndHeight +
              EPOCH_DISTRIBUTION_DELAY,
          ),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
        });
      const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
      const expectedNewEpochEndHeight =
        expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
      expect(balances).toEqual(initialState.balances);
      expect(distributions).toEqual({
        ...initialState.distributions,
        epochPeriod: initialState.distributions.epochPeriod + 1,
        epochStartHeight: expectedNewEpochStartHeight,
        epochEndHeight: expectedNewEpochEndHeight,
        nextDistributionHeight:
          expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
      });
      expect(gateways).toEqual(initialState.gateways);
    });

    it('should not distribute rewards if no observations were submitted, but should update epoch counts for gateways, the distribution epoch values and prescribed observers', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 10_000_000,
        },
        gateways: stubbedGateways,
        observations: {},
        prescribedObservers: {
          [0]: stubbedPrescribedObservers,
        },
      };
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(
            initialState.distributions.nextDistributionHeight,
          ),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
        });
      expect(balances).toEqual({
        ...initialState.balances,
      });
      const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
      const expectedNewEpochEndHeight =
        expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
      expect(distributions).toEqual({
        ...initialState.distributions,
        epochPeriod: initialState.distributions.epochPeriod + 1,
        epochStartHeight: expectedNewEpochStartHeight,
        epochEndHeight: expectedNewEpochEndHeight,
        nextDistributionHeight:
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

    it('should distribute rewards to observers who submitted reports and gateways who passed for the previous epoch, update distribution epoch values and increment performance stats', async () => {
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
              [stubbedGateways['a-gateway-3'].observerWallet]:
                stubbedArweaveTxId,
              // gateway-2 did not submit a report
            },
          },
        },
        distributions: {
          ...getBaselineState().distributions,
          // setting these to next epoch values to validate distributions depend on only the nextDistributionHeight
          epochEndHeight: SmartWeave.block.height + 2 * EPOCH_BLOCK_LENGTH - 1,
          epochStartHeight: SmartWeave.block.height + EPOCH_BLOCK_LENGTH - 1,
        },
        prescribedObservers: {
          0: stubbedPrescribedObservers,
        },
      };
      const nextDistributionHeight =
        initialState.distributions.nextDistributionHeight;
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(nextDistributionHeight),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
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
        'a-gateway': 0, // gets observer and gateway reward auto staked
        'a-gateway-2': badObserverGoodGatewayReward, // gets gateway reward, but penalized for not submitting a report
        'a-gateway-3': goodObserverBadGatewayReward, // gets observer reward, but no gateway reward
        [SmartWeave.contract.id]: 10_000_000 - totalRewardsDistributed,
      });
      const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
      const expectedNewEpochEndHeight =
        expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
      expect(distributions).toEqual({
        ...initialState.distributions,
        epochPeriod: initialState.distributions.epochPeriod + 1,
        epochStartHeight: expectedNewEpochStartHeight,
        epochEndHeight: expectedNewEpochEndHeight,
        nextDistributionHeight:
          expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
      });
      expect(gateways).toEqual({
        ...initialState.gateways,
        'a-gateway': {
          ...initialState.gateways['a-gateway'],
          operatorStake:
            initialState.gateways['a-gateway'].operatorStake +
            goodObserverAndGatewayReward,
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

    it('should distribute auto staked rewards to observers who submitted reports and gateways who passed for the previous epoch, update distribution epoch values and increment performance stats', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 10_000_000,
        },
        gateways: {
          ...stubbedGateways,
          'a-gateway': {
            // this gateway has auto staking set to true
            ...stubbedGatewayData,
            operatorStake: 100,
            observerWallet: 'a-gateway-observer',
            settings: {
              label: 'test-gateway',
              fqdn: 'test.com',
              port: 443,
              protocol: 'https',
              minDelegatedStake: MIN_DELEGATED_STAKE + 666,
              allowDelegatedStaking: false,
              autoStake: true,
            },
          },
        },
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
              [stubbedGateways['a-gateway-3'].observerWallet]:
                stubbedArweaveTxId,
              // gateway-2 did not submit a report
            },
          },
        },
        distributions: {
          ...getBaselineState().distributions,
          // setting these to next epoch values to validate distributions depend on only the nextDistributionHeight
          epochEndHeight: SmartWeave.block.height + 2 * EPOCH_BLOCK_LENGTH - 1,
          epochStartHeight: SmartWeave.block.height + EPOCH_BLOCK_LENGTH - 1,
        },
        prescribedObservers: {
          0: stubbedPrescribedObservers,
        },
      };
      const nextDistributionHeight =
        initialState.distributions.nextDistributionHeight;
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(nextDistributionHeight),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
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
        'a-gateway': 0, // Reward is auto staked
        'a-gateway-2': badObserverGoodGatewayReward, // gets gateway reward, but penalized for not submitting a report
        'a-gateway-3': goodObserverBadGatewayReward, // gets observer reward, but no gateway reward
        [SmartWeave.contract.id]: 10_000_000 - totalRewardsDistributed,
      });
      const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
      const expectedNewEpochEndHeight =
        expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
      expect(distributions).toEqual({
        ...initialState.distributions,
        epochPeriod: initialState.distributions.epochPeriod + 1,
        epochStartHeight: expectedNewEpochStartHeight,
        epochEndHeight: expectedNewEpochEndHeight,
        nextDistributionHeight:
          expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
      });
      expect(gateways['a-gateway']).toEqual({
        // this gateway has auto staking set to true
        ...stubbedGatewayData,
        observerWallet: 'a-gateway-observer',
        operatorStake:
          goodObserverAndGatewayReward +
          initialState.gateways['a-gateway'].operatorStake,
        settings: {
          label: 'test-gateway',
          fqdn: 'test.com',
          port: 443,
          protocol: 'https',
          minDelegatedStake: MIN_DELEGATED_STAKE,
          allowDelegatedStaking: false,
          autoStake: true,
        },
        stats: {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 1,
          passedEpochCount: 1,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 1,
        },
      });
      expect(gateways['a-gateway-2']).toEqual({
        ...initialState.gateways['a-gateway-2'],
        stats: {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 0,
          passedEpochCount: 1,
          failedConsecutiveEpochs: 0,
          totalEpochParticipationCount: 1,
        },
      });
      expect(gateways['a-gateway-3']).toEqual({
        ...initialState.gateways['a-gateway-3'],
        stats: {
          totalEpochsPrescribedCount: 1,
          submittedEpochCount: 1,
          passedEpochCount: 0,
          failedConsecutiveEpochs: 1,
          totalEpochParticipationCount: 1,
        },
      });
    });

    // top level tests
    it('should tick distributions for the previous epoch, update gateway performance stats and increment the nextDistributionHeight if a the interaction height is equal to the nextDistributionHeight', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        gateways: stubbedGateways,
        prescribedObservers: {
          [0]: stubbedPrescribedObservers,
        },
      };

      // stub the demand factor change
      (updateDemandFactor as jest.Mock).mockReturnValue(initialState);

      // update our state
      SmartWeave.block.height =
        initialState.distributions.nextDistributionHeight;

      const { state } = await tick(initialState);

      expect(state).toEqual({
        ...initialState,
        lastTickedHeight: initialState.distributions.nextDistributionHeight,
        distributions: {
          epochZeroStartHeight: initialState.distributions.epochZeroStartHeight,
          epochStartHeight:
            initialState.distributions.epochStartHeight + EPOCH_BLOCK_LENGTH,
          epochEndHeight:
            initialState.distributions.epochEndHeight + EPOCH_BLOCK_LENGTH,
          nextDistributionHeight:
            initialState.distributions.epochEndHeight +
            EPOCH_BLOCK_LENGTH +
            EPOCH_DISTRIBUTION_DELAY,
          epochPeriod: initialState.distributions.epochPeriod + 1,
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
        prescribedObservers: {
          [initialState.distributions.epochEndHeight + 1]: Object.keys(
            stubbedGateways,
          ).map((gatewayAddress: string) => {
            return {
              // updated weights based on the new epoch
              ...stubbedPrescribedObserver,
              gatewayAddress,
              observerAddress: stubbedGateways[gatewayAddress].observerWallet,
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
        },
      });
    });
  });

  describe('tickRewardDistributionWithDelegates', () => {
    beforeEach(() => {
      (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([
        {
          gatewayAddress: 'a-gateway',
          observerAddress: 'an-observing-gateway',
          stake: 200,
          start: 0,
          stakeWeight: 20,
          tenureWeight: 1,
          gatewayRewardRatioWeight: 1,
          observerRewardRatioWeight: 1,
          compositeWeight: 1,
          normalizedCompositeWeight: 1,
        },
        {
          gatewayAddress: 'a-gateway-2',
          observerAddress: 'an-observing-gateway-2',
          stake: 300,
          start: 0,
          stakeWeight: 30,
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
        {
          gatewayAddress: 'a-gateway-4',
          observerAddress: 'an-observing-gateway-4',
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
          gatewayAddress: 'a-gateway-5',
          observerAddress: 'an-observing-gateway-5',
          stake: 400,
          start: 0,
          stakeWeight: 20,
          tenureWeight: 1,
          gatewayRewardRatioWeight: 1,
          observerRewardRatioWeight: 1,
          compositeWeight: 1,
          normalizedCompositeWeight: 1,
        },
      ]);
      (getEligibleGatewaysForEpoch as jest.Mock).mockReturnValue({
        'a-gateway': {
          ...stubbedGatewayData,
          totalDelegatedStake: 200,
          settings: {
            ...stubbedGatewayData.settings,
            allowDelegatedStaking: true,
            delegateRewardShareRatio: 50,
          },
          delegates: {
            ['delegate-1']: {
              ...stubbedDelegateData,
            },
            ['filtered-delegate']: {
              ...stubbedDelegateData,
              start: 1,
            },
          },
          observerWallet: 'an-observing-gateway',
        },
        'a-gateway-2': {
          ...stubbedGatewayData,
          totalDelegatedStake: 200,
          settings: {
            ...stubbedGatewayData.settings,
            allowDelegatedStaking: true,
            delegateRewardShareRatio: 50,
          },
          delegates: {
            ['delegate-2']: {
              ...stubbedDelegateData,
            },
            ['delegate-3']: {
              ...stubbedDelegateData,
            },
          },
          observerWallet: 'an-observing-gateway-2',
        },
        'a-gateway-3': {
          ...stubbedDelegatedGatewayData,
          observerWallet: 'an-observing-gateway-3',
        },
        'a-gateway-4': {
          ...stubbedGatewayData,
          observerWallet: 'an-observing-gateway-4',
        },
        'a-gateway-5': {
          ...stubbedGatewayData,
          totalDelegatedStake: 300,
          settings: {
            ...stubbedGatewayData.settings,
            allowDelegatedStaking: true,
            delegateRewardShareRatio: 50,
          },
          delegates: {
            ['delegate-4']: {
              ...stubbedDelegateData,
            },
            ['delegate-5']: {
              ...stubbedDelegateData,
            },
            ['delegate-6']: {
              ...stubbedDelegateData,
            },
          },
          observerWallet: 'an-observing-gateway-5',
        },
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should distribute rewards to observers and gateways, along with their valid delegates', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        balances: {
          [SmartWeave.contract.id]: 10_000_000,
        },
        gateways: {
          'a-gateway': {
            ...stubbedGatewayData,
            totalDelegatedStake: stubbedDelegateData.delegatedStake * 2,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
              delegateRewardShareRatio: 50,
            },
            delegates: {
              ['delegate-1']: {
                ...stubbedDelegateData,
              },
              ['filtered-delegate']: {
                // this delegate is ineligible for rewards since it joined after epoch start height
                ...stubbedDelegateData,
                start: 1,
              },
            },
            observerWallet: 'an-observing-gateway',
          },
          'a-gateway-2': {
            ...stubbedGatewayData,
            totalDelegatedStake: stubbedDelegateData.delegatedStake * 2,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
              delegateRewardShareRatio: 50,
            },
            delegates: {
              ['delegate-2']: {
                ...stubbedDelegateData,
              },
              ['delegate-3']: {
                ...stubbedDelegateData,
              },
            },
            observerWallet: 'an-observing-gateway-2',
          },
          'a-gateway-3': {
            ...stubbedGatewayData,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
              delegateRewardShareRatio: 50,
            },
            observerWallet: 'an-observing-gateway-3',
          },
          'a-gateway-4': {
            ...stubbedGatewayData,
            observerWallet: 'an-observing-gateway-4',
          },
          'a-gateway-5': {
            ...stubbedGatewayData,
            totalDelegatedStake: stubbedDelegateData.delegatedStake * 3,
            settings: {
              ...stubbedGatewayData.settings,
              allowDelegatedStaking: true,
              delegateRewardShareRatio: 30,
            },
            delegates: {
              ['delegate-4']: {
                ...stubbedDelegateData,
              },
              ['delegate-5']: {
                ...stubbedDelegateData,
              },
              ['delegate-6']: {
                ...stubbedDelegateData,
              },
            },
            observerWallet: 'an-observing-gateway-5',
          },
        },
        observations: {
          // 3 good gateways, 1 good gateway/bad observer, 3 good observers
          0: {
            failureSummaries: {
              // nobody failed a-gateway-1
              'a-gateway-2': ['an-observing-gateway'],
              'a-gateway-3': [
                'an-observing-gateway',
                'an-observing-gateway-2',
                'an-observing-gateway-4',
              ], // a-gateway-3 will not receive a gateway reward
              'a-gateway-4': ['an-observing-gateway-2'],
              'a-gateway-5': ['an-observing-gateway'],
            },
            // all will get observer reward
            reports: {
              'an-observing-gateway': stubbedArweaveTxId,
              'an-observing-gateway-2': stubbedArweaveTxId,
              // observer 3 did not submit a report and will not receive an observer reward
              'an-observing-gateway-4': stubbedArweaveTxId,
              // observer 5 did not submit a report and will not receive an observer reward
            },
          },
        },
      };
      const epochDistributionHeight =
        initialState.distributions.nextDistributionHeight;
      const { balances, distributions, gateways } =
        await tickRewardDistribution({
          currentBlockHeight: new BlockHeight(epochDistributionHeight),
          gateways: initialState.gateways,
          balances: initialState.balances,
          distributions: initialState.distributions,
          observations: initialState.observations,
          prescribedObservers: initialState.prescribedObservers,
        });
      const totalPotentialReward = Math.floor(
        10_000_000 * EPOCH_REWARD_PERCENTAGE,
      );

      const totalPotentialGatewayReward = Math.floor(
        totalPotentialReward * GATEWAY_PERCENTAGE_OF_EPOCH_REWARD,
      );

      const perGatewayReward = Math.floor(
        totalPotentialGatewayReward / Object.keys(initialState.gateways).length,
      );
      const totalPotentialObserverReward =
        totalPotentialReward - totalPotentialGatewayReward;
      const perObserverReward = Math.floor(
        totalPotentialObserverReward /
          Object.keys(initialState.gateways).length,
      );

      const penalizedGatewayReward = Math.floor(
        perGatewayReward * (1 - BAD_OBSERVER_GATEWAY_PENALTY),
      );
      const totalRewardsDistributed =
        perObserverReward * 3 + perGatewayReward * 3 + penalizedGatewayReward; // 3 rewards for 3 observers, 3 gateway rewards, 1 penalized gateway reward

      // one delegate gets all the reward, the other joined too late
      expect(
        gateways['a-gateway'].delegates['delegate-1'].delegatedStake,
      ).toEqual(
        initialState.gateways['a-gateway'].delegates['delegate-1']
          .delegatedStake +
          Math.floor((perObserverReward + perGatewayReward) * 0.5), // splits the reward fully with the gateway
      );
      expect(
        gateways['a-gateway'].delegates['filtered-delegate'].delegatedStake,
      ).toEqual(
        initialState.gateways['a-gateway'].delegates['filtered-delegate']
          .delegatedStake,
      );

      // 50% distribution to delegates, split evenly (25% each)
      for (const delegateAddress of Object.keys(
        initialState.gateways['a-gateway-2'].delegates,
      )) {
        const delegateBefore =
          initialState.gateways['a-gateway-2'].delegates[delegateAddress];
        const delegateAfter =
          gateways['a-gateway-2'].delegates[delegateAddress];
        expect(delegateAfter.delegatedStake).toEqual(
          delegateBefore.delegatedStake +
            Math.floor(perGatewayReward * 0.25) + // gets 1/4 of the total reward
            Math.floor(perObserverReward * 0.25), // gets 1/4 of the total reward, rounded down
        );
      }

      // 30% distribution to delegates, split evenly but gateway penalized (10% each)
      for (const delegateAddress of Object.keys(
        initialState.gateways['a-gateway-5'].delegates,
      )) {
        const delegateBefore =
          initialState.gateways['a-gateway-5'].delegates[delegateAddress];
        const delegateAfter =
          gateways['a-gateway-5'].delegates[delegateAddress];
        expect(delegateAfter.delegatedStake).toEqual(
          Math.floor(
            delegateBefore.delegatedStake +
              Math.floor(penalizedGatewayReward * 0.1),
          ),
        );
      }

      expect(balances).toEqual({
        ...initialState.balances,
        'a-gateway': (perObserverReward + perGatewayReward) * 0.5, // gives 50% of reward to delegate 1
        'a-gateway-2': (perObserverReward + perGatewayReward) * 0.5 + 2, // splits reward with delegate 2 and 3, gets remaining tokens from rounding
        'a-gateway-4': perObserverReward + perGatewayReward, // gets full reward (no delegates)
        'a-gateway-5': Math.ceil(penalizedGatewayReward * 0.7), // split reward with delegates 4, 5, 6
        // observer three does not get anything!
        [SmartWeave.contract.id]: 10_000_000 - totalRewardsDistributed,
      });

      const expectedNewEpochStartHeight = EPOCH_BLOCK_LENGTH;
      const expectedNewEpochEndHeight =
        expectedNewEpochStartHeight + EPOCH_BLOCK_LENGTH - 1;
      expect(distributions).toEqual({
        ...initialState.distributions,
        epochStartHeight: expectedNewEpochStartHeight,
        epochEndHeight: expectedNewEpochEndHeight,
        nextDistributionHeight:
          expectedNewEpochEndHeight + EPOCH_DISTRIBUTION_DELAY,
        epochPeriod: initialState.distributions.epochPeriod + 1,
      });
    });
  });
});
