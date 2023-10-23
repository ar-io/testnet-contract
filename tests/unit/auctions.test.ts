import { submitAuctionBid } from '../../src/actions/write/submitAuctionBid';
import {
  ARNS_NAME_AUCTION_EXPIRED_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  SECONDS_IN_A_YEAR,
} from '../../src/constants';
import { IOState } from '../../src/types';
import { FEE_STRUCTURE } from '../utils/constants';

describe('submitAuctionBid', () => {
  const baselineDemandFactorData = {
    periodZeroBlockHeight: 0,
    currentPeriod: 0,
    trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
    purchasesThisPeriod: 0,
    demandFactor: 1,
    consecutivePeriodsWithMinDemandFactor: 0,
  };

  const baselineAuctionSettings = {
    auctionDuration: 100,
    decayInterval: 10,
    decayRate: 0.9,
    startPriceMultiplier: 100,
    floorPriceMultiplier: 1,
  };

  const baselineIOState: IOState = {
    ticker: 'ARNS-TEST',
    name: 'Arweave Name System Test',
    canEvolve: true,
    owner: '',
    evolve: null,
    records: {},
    balances: {},
    reserved: {},
    fees: FEE_STRUCTURE,
    auctions: {},
    settings: {
      registry: {
        minLockLength: 720,
        maxLockLength: 788400,
        minNetworkJoinStakeAmount: 10000,
        minGatewayJoinLength: 3600,
        gatewayLeaveLength: 3600,
        operatorStakeWithdrawLength: 3600,
      },
      auctions: baselineAuctionSettings,
    },
    gateways: {},
    lastTickedHeight: 0,
    demandFactoring: baselineDemandFactorData,
  };

  const baselineAuctionState: Partial<IOState> = {
    auctions: {
      'test-auction-close': {
        startHeight: 1,
        startPrice: 1_000,
        endHeight: 101,
        floorPrice: 100,
        type: 'lease',
        initiator: 'initiator',
        contractTxId: 'contractTxId',
        years: 1,
        settings: baselineAuctionSettings,
      },
    },
  };

  it.each([
    [
      baselineAuctionState,
      {
        name: 'test-auction-close',
        contractTxId: 'invalid',
      },
      {
        name: '_invalid_name',
        contractTxId: 'atomic',
      },
    ],
  ])(
    'should fail input validation',
    (inputOverrides: Partial<IOState>, badInput: Partial<IOState>) => {
      const inputData: IOState = {
        ...baselineIOState,
        ...inputOverrides,
      };
      expect(() => {
        submitAuctionBid(inputData, {
          caller: 'new-bidder',
          input: badInput,
        });
      }).toThrowError();
    },
  );

  it('should throw insufficient balance error when the initiator does not have enough balance when trying to start an auction', () => {
    const priceForName = 220_000;
    const inputData = {
      ...baselineIOState,
      balances: { initiator: priceForName - 1 },
    };
    expect(() => {
      submitAuctionBid(inputData, {
        caller: 'initiator',
        input: {
          name: 'test-new-auction',
          contractTxId: 'atomic',
        },
      });
    }).toThrowError(new Error(INSUFFICIENT_FUNDS_MESSAGE));
  });

  it('should create a new auction and decrement the initiators balance, increase the protocol balance, and remove the reserved name', () => {
    const priceForName = 220_000; // TODO: stub this out
    const inputData = {
      ...baselineIOState,
      reserved: {
        'test-new-auction': {
          target: 'initiator',
        },
      },
      balances: { initiator: priceForName },
    };
    const { state } = submitAuctionBid(inputData, {
      caller: 'initiator',
      input: {
        name: 'test-new-auction',
        contractTxId: 'atomic',
      },
    });
    expect(state).toEqual({
      ...baselineIOState,
      balances: {
        initiator: 0,
        'stubbed-contract-id': priceForName,
      },
      auctions: {
        'test-new-auction': {
          contractTxId: 'stubbed-transaction-id',
          endHeight: 101,
          type: 'lease',
          startHeight: 1,
          initiator: 'initiator',
          startPrice:
            priceForName * baselineAuctionSettings.startPriceMultiplier,
          floorPrice: priceForName,
          years: 1,
          settings: {
            ...baselineAuctionSettings,
          },
        },
      },
    });
  });

  it('should throw an insufficient balance error when a second bidder attempts to bid on an auction with insufficient funds', () => {
    const inputData: IOState = {
      ...baselineIOState,
      ...baselineAuctionState,
      balances: {
        'new-bidder': 0,
      },
    };
    expect(() => {
      submitAuctionBid(inputData, {
        caller: 'new-bidder',
        input: {
          name: 'test-auction-close',
          contractTxId: 'atomic',
        },
      });
    }).toThrowError(new Error(INSUFFICIENT_FUNDS_MESSAGE));
  });

  it('should throw an error when the provided quantity is less than the required minimum bid', () => {
    const inputData: IOState = {
      ...baselineIOState,
      ...baselineAuctionState,
      balances: {
        'new-bidder': 1_000,
      },
    };
    expect(() => {
      submitAuctionBid(inputData, {
        caller: 'new-bidder',
        input: {
          name: 'test-auction-close',
          contractTxId: 'atomic',
          qty: 999,
        },
      });
    }).toThrowError(
      new Error(
        `The bid (${999} IO) is less than the current required minimum bid of ${1_000} IO.`,
      ),
    );
  });

  it('should throw an error when the auction has already expired', () => {
    const inputData: IOState = {
      ...baselineIOState,
      auctions: {
        'test-auction-close': {
          ...baselineAuctionState['auctions']['test-auction-close'],
          endHeight: 0,
        },
      },
      balances: {
        'new-bidder': 1_000,
      },
    };
    expect(() => {
      submitAuctionBid(inputData, {
        caller: 'new-bidder',
        input: {
          name: 'test-auction-close',
          contractTxId: 'atomic',
        },
      });
    }).toThrowError(new Error(ARNS_NAME_AUCTION_EXPIRED_MESSAGE));
  });

  it('should close out an auction, update records, return balance to initiator, update protocol balance and increase demand factor for the period when a second bidder wins the auction', () => {
    const inputData: IOState = {
      ...baselineIOState,
      ...baselineAuctionState,
      balances: {
        'stubbed-contract-id': 100, // assumes the floor price was already given to the protocol balance
        'new-bidder': 1_000,
      },
    };
    const { state } = submitAuctionBid(inputData, {
      caller: 'new-bidder',
      input: {
        name: 'test-auction-close',
        contractTxId: 'atomic',
      },
    });
    expect(state).toEqual({
      ...baselineIOState,
      auctions: {},
      records: {
        'test-auction-close': {
          contractTxId: 'stubbed-transaction-id',
          endTimestamp: SECONDS_IN_A_YEAR + 1,
          type: 'lease',
          startTimestamp: 1,
          undernames: 10,
        },
      },
      demandFactoring: {
        ...baselineDemandFactorData,
        purchasesThisPeriod: 1,
      },
      balances: {
        initiator: 100,
        'stubbed-contract-id': 1_000,
        'new-bidder': 0,
      },
    });
  });
});
