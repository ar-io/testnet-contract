import {
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  MIN_DELEGATED_STAKE,
  TOTAL_IO_SUPPLY,
} from './constants';
import { getBaselineState } from './tests/stubs';
import {
  BlockHeight,
  BlockTimestamp,
  GatewayStatus,
  IOState,
  mIOToken,
} from './types';
import {
  calculateYearsBetweenTimestamps,
  incrementBalance,
  isGatewayEligibleToBeRemoved,
  isGatewayEligibleToLeave,
  isGatewayJoined,
  resetProtocolBalance,
  unsafeDecrementBalance,
} from './utilities';

describe('isGatewayJoined function', () => {
  it('should return false if gateway is undefined', () => {
    expect(
      isGatewayJoined({
        gateway: undefined,
        currentBlockHeight: new BlockHeight(0),
      }),
    ).toEqual(false);
  });

  it.each([
    [0, 0, 'joined', true],
    [0, 0, 'leaving', false],
    [0, 1, 'joined', false],
    [0, 1, 'leaving', false],
  ])(
    'should, given current block height %d and gateway start height %d and status %s, return %s',
    (currentBlockHeight, gatewayStartHeight, status, expectedValue) => {
      expect(
        isGatewayJoined({
          currentBlockHeight: new BlockHeight(currentBlockHeight),
          gateway: {
            start: gatewayStartHeight,
            end: 0,
            status: status as GatewayStatus,
            vaults: {},
            delegates: {},
            operatorStake: 10_000,
            totalDelegatedStake: 0,
            observerWallet: '',
            settings: {
              // None of these values should be relevant to this test
              label: '',
              fqdn: '',
              port: Number.NEGATIVE_INFINITY,
              protocol: 'https',
              minDelegatedStake: MIN_DELEGATED_STAKE.valueOf(),
              autoStake: false,
            },
            stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
          },
        }),
      ).toEqual(expectedValue);
    },
  );
});

describe('isGatewayEligibleToBeRemoved function', () => {
  it('should return false if gateway is undefined', () => {
    expect(
      isGatewayEligibleToBeRemoved({
        gateway: undefined,
        currentBlockHeight: new BlockHeight(0),
      }),
    ).toEqual(false);
  });

  it.each([
    [0, 1, 'joined', false],
    [0, 1, 'leaving', false],
    [1, 1, 'joined', false],
    [1, 1, 'leaving', true],
    [2, 1, 'joined', false],
    [2, 1, 'leaving', true],
  ])(
    `should, given current block height %d, gateway start height of %d and status %s, return %s`,
    (currentBlockHeight, gatewayEndBlock, status, expectedValue) => {
      expect(
        isGatewayEligibleToBeRemoved({
          gateway: {
            start: Number.NEGATIVE_INFINITY,
            end: gatewayEndBlock,
            status: status as GatewayStatus,
            vaults: {},
            delegates: {},
            operatorStake: Number.NEGATIVE_INFINITY,
            totalDelegatedStake: 0,
            observerWallet: '',
            settings: {
              // None of these values should be relevant to this test
              label: '',
              fqdn: '',
              port: Number.NEGATIVE_INFINITY,
              protocol: 'https',
              minDelegatedStake: MIN_DELEGATED_STAKE.valueOf(),
              autoStake: false,
            },
            stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
          },
          currentBlockHeight: new BlockHeight(currentBlockHeight),
        }),
      ).toEqual(expectedValue);
    },
  );
});

describe('isGatewayEligibleToLeave function', () => {
  it('should return false if gateway is undefined', () => {
    expect(
      isGatewayEligibleToLeave({
        gateway: undefined,
        currentBlockHeight: new BlockHeight(0),
        minimumGatewayJoinLength: new BlockHeight(Number.MAX_SAFE_INTEGER),
      }),
    ).toEqual(false);
  });

  it.each([
    [0, 0, Number.MAX_SAFE_INTEGER, 'joined', false],
    [0, 0, Number.MAX_SAFE_INTEGER, 'leaving', false],
    [1, 0, Number.MAX_SAFE_INTEGER, 'joined', false],
    [1, 0, Number.MAX_SAFE_INTEGER, 'leaving', false],
    [2, 0, Number.MAX_SAFE_INTEGER, 'joined', true],
    [2, 0, Number.MAX_SAFE_INTEGER, 'leaving', false],
    [2, 2, Number.MAX_SAFE_INTEGER, 'joined', false],
    [2, 0, 2, 'leaving', false],
    [2, 0, 3, 'joined', true],
    [2, 0, 3, 'leaving', false],
  ])(
    `should, given current block height %d, gateway start/end blocks (%d, %d) and status %s, return %s`,
    (
      currentBlockHeight,
      gatewayStartBlock,
      gatewayEndBlock,
      status,
      expectedValue,
    ) => {
      expect(
        isGatewayEligibleToLeave({
          gateway: {
            start: gatewayStartBlock,
            end: gatewayEndBlock,
            status: status as GatewayStatus,
            vaults: {},
            delegates: {},
            operatorStake: 0,
            totalDelegatedStake: 0,
            observerWallet: '',
            settings: {
              // None of these values should be relevant to this test
              label: '',
              fqdn: '',
              port: Number.NEGATIVE_INFINITY,
              protocol: 'https',
              minDelegatedStake: MIN_DELEGATED_STAKE.valueOf(),
              autoStake: false,
            },
            stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
          },
          currentBlockHeight: new BlockHeight(currentBlockHeight),
          minimumGatewayJoinLength: new BlockHeight(2),
        }),
      ).toEqual(expectedValue);
    },
  );
});

describe('calculateYearsBetweenTimestamps function', () => {
  it.each([
    [new BlockTimestamp(0), new BlockTimestamp(0)],
    [new BlockTimestamp(1), new BlockTimestamp(1)],
    [
      new BlockTimestamp(Number.MAX_SAFE_INTEGER),
      new BlockTimestamp(Number.MAX_SAFE_INTEGER),
    ],
  ])(
    'should return 0 if the timestamps (start: %p, end: %p) are the same',
    (startTimestamp, endTimestamp) => {
      expect(
        calculateYearsBetweenTimestamps({
          startTimestamp,
          endTimestamp,
        }),
      ).toEqual(0);
    },
  );

  it.each([
    [new BlockTimestamp(0), new BlockTimestamp(157679), 0],
    [new BlockTimestamp(0), new BlockTimestamp(315359), 0.01],
    [new BlockTimestamp(0), new BlockTimestamp(315360), 0.01],
    [new BlockTimestamp(0), new BlockTimestamp(473040), 0.01],
    [new BlockTimestamp(0), new BlockTimestamp(473041), 0.02],
  ])(
    'should have two digits of precision (start: %p, end: %p)',
    (startTimestamp, endTimestamp, expectedValue) => {
      expect(
        calculateYearsBetweenTimestamps({
          startTimestamp,
          endTimestamp,
        }),
      ).toEqual(expectedValue);
    },
  );

  it.each([
    [new BlockTimestamp(0), new BlockTimestamp(31_536_000), 1],
    [new BlockTimestamp(31_536_000), new BlockTimestamp(0), -1],
  ])(
    'should return positive and negative values (start: %p, end: %p)',
    (startTimestamp, endTimestamp, expectedValue) => {
      expect(
        calculateYearsBetweenTimestamps({
          startTimestamp,
          endTimestamp,
        }),
      ).toEqual(expectedValue);
    },
  );
});

describe('unsafeDecrementBalance function', () => {
  it('should not throw an error if address does not exist', () => {
    const balances = { foo: 1, bar: 2 };
    expect(() => {
      unsafeDecrementBalance(balances, 'baz', new mIOToken(1));
    }).not.toThrow();
    expect(balances).toEqual({ foo: 1, bar: 2, baz: Number.NaN });
  });

  it('should decrement balance of address if it exists', () => {
    const balances = { foo: 1, bar: 2 };
    unsafeDecrementBalance(balances, 'foo', new mIOToken(balances.foo));
    expect(balances).toEqual({ bar: 2 });
  });

  it('should decrement and remove balance of address if it exists and is fully drained', () => {
    const balances = { foo: 1, bar: 2 };
    unsafeDecrementBalance(balances, 'foo', new mIOToken(balances.foo));
    expect(balances).toEqual({ bar: 2 });
  });

  it('should decrement and not remove balance of address if it exists and is fully drained when removeIfZero is false', () => {
    const balances = { foo: 1, bar: 2 };
    unsafeDecrementBalance(balances, 'foo', new mIOToken(balances.foo), false);
    expect(balances).toEqual({ foo: 0, bar: 2 });
  });
});

describe('incrementBalance function', () => {
  it('should add and increment balance of address if it does not yet exist', () => {
    const balances = { foo: 1, bar: 2 };
    incrementBalance(balances, 'baz', new mIOToken(1));
    expect(balances).toEqual({ foo: 1, bar: 2, baz: 1 });
  });

  it('should increment balance of address if it already exists', () => {
    const balances = { foo: 1, bar: 2 };
    const balanceFoo = new mIOToken(balances.foo);
    incrementBalance(balances, 'foo', balanceFoo);
    expect(balances).toEqual({ foo: 2, bar: 2 });
  });
});

describe('resetProtocolBalance function', () => {
  it('should reset protocol balance to the expected difference', () => {
    const initialProtocolBalance = 100;
    const testingState: IOState = {
      ...getBaselineState(),
      balances: {
        [SmartWeave.contract.id]: initialProtocolBalance,
        'address-1': 100,
        'address-2': 100,
        'address-3': 100,
      },
      vaults: {
        'address-2': {
          'vault-1': {
            balance: 100,
            start: 0,
            end: 0,
          },
          'vault-2': {
            balance: 100,
            start: 0,
            end: 0,
          },
        },
      },
      auctions: {
        'fake-auction': {
          startPrice: 0,
          floorPrice: 200,
          startHeight: 0,
          endHeight: 0,
          type: 'lease',
          initiator: 'address-3',
          contractTxId: '',
          years: 1,
        },
      },
      gateways: {
        'address-1': {
          start: 0,
          end: 0,
          status: 'joined',
          vaults: {
            'vault-1': {
              balance: 100,
              start: 0,
              end: 0,
            },
          },
          delegates: {},
          operatorStake: 100,
          totalDelegatedStake: 0,
          observerWallet: '',
          settings: {
            label: '',
            fqdn: '',
            port: 1234,
            protocol: 'https',
            minDelegatedStake: MIN_DELEGATED_STAKE.valueOf(),
            autoStake: false,
          },
          stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
        },
      },
    };
    const totalNonProtocolBalances = 900;
    const expectedProtocolBalance =
      TOTAL_IO_SUPPLY.valueOf() - totalNonProtocolBalances;
    const { balances: updatedBalances } = resetProtocolBalance(testingState);
    expect(updatedBalances).toEqual({
      ...testingState.balances,
      [SmartWeave.contract.id]: expectedProtocolBalance,
    });
  });
});
