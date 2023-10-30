import { submitAuctionBid } from '../../actions/write/submitAuctionBid';
import {
  ARNS_NAME_AUCTION_EXPIRED_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_YEARS,
  RESERVED_ATOMIC_TX_ID,
  SECONDS_IN_A_YEAR,
} from '../../constants';
import { FEE_STRUCTURE } from '../../constants';
import { AuctionData, IOState } from '../../types';

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

  const getBaselineState = (): IOState => ({
    ticker: 'ARNS-TEST',
    name: 'Arweave Name System Test',
    canEvolve: true,
    owner: '',
    evolve: '',
    records: {},
    balances: {},
    reserved: {},
    fees: {
      ...FEE_STRUCTURE,
    },
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
    observations: {},
    demandFactoring: {
      ...baselineDemandFactorData,
      trailingPeriodPurchases:
        baselineDemandFactorData.trailingPeriodPurchases.slice(),
    },
  });

  const baselineAuctionData: AuctionData = {
    startHeight: 1,
    startPrice: 1_000,
    endHeight: 101,
    floorPrice: 100,
    type: 'lease',
    initiator: 'initiator',
    contractTxId: 'contractTxId',
    years: 1,
    settings: baselineAuctionSettings,
  };

  const baselineAuctionState: Partial<IOState> = {
    auctions: {
      'test-auction-close': {
        ...baselineAuctionData,
      },
    },
  };

  it.each([
    [
      'should throw an error when contractTxId is invalid',
      {
        name: 'test-auction-close',
        contractTxId: 'invalid',
      },
    ],
    [
      'should throw an error when auction name is invalid',
      {
        name: '_invalid_name',
        contractTxId: RESERVED_ATOMIC_TX_ID,
      },
    ],
    [
      'should throw an error when name is missing',
      {
        contractTxId: RESERVED_ATOMIC_TX_ID,
      },
    ],
    [
      'should throw an error when type is invalid',
      {
        name: 'valid-name',
        contractTxId: RESERVED_ATOMIC_TX_ID,
        type: 'invalid',
      },
    ],
    [
      'should throw an error when years is over the maximum',
      {
        name: 'valid-name',
        contractTxId: RESERVED_ATOMIC_TX_ID,
        type: 'lease',
        years: MAX_YEARS + 1,
      },
    ],
    [
      'should throw an error when years is less than 1',
      {
        name: 'valid-name',
        contractTxId: RESERVED_ATOMIC_TX_ID,
        type: 'lease',
        years: 0,
      },
    ],
  ])('%s', (_, badInput: unknown) => {
    const inputData: IOState = getBaselineState();
    expect(() => {
      submitAuctionBid(inputData, {
        caller: 'new-bidder',
        input: badInput,
      });
    }).toThrowError();
  });

  it('should throw insufficient balance error when the initiator does not have enough balance when trying to start an auction', () => {
    const priceForName = 220_000;
    const inputData = {
      ...getBaselineState(),
      balances: { initiator: priceForName - 1, 'stubbed-contract-id': 0 },
    };
    expect(() => {
      submitAuctionBid(inputData, {
        caller: 'initiator',
        input: {
          name: 'test-new-auction',
          contractTxId: RESERVED_ATOMIC_TX_ID,
        },
      });
    }).toThrowError(new Error(INSUFFICIENT_FUNDS_MESSAGE));
  });

  it.each([
    [
      {
        contractTxId: RESERVED_ATOMIC_TX_ID,
        type: 'lease',
      },
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'lease',
        floorPrice: 220_000,
      },
    ],
    [
      {
        contractTxId: RESERVED_ATOMIC_TX_ID,
        type: 'lease',
        years: 5,
      },
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'lease',
        floorPrice: 220_000,
      },
    ],
    [
      {
        contractTxId: RESERVED_ATOMIC_TX_ID,
        type: 'permabuy',
      },
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'permabuy',
        floorPrice: 200_000,
      },
    ],
    [
      {
        contractTxId: 'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc',
        type: 'permabuy',
      },
      {
        contractTxId: 'E-pRI1bokGWQBqHnbut9rsHSt9Ypbldos3bAtwg4JMc',
        type: 'permabuy',
        floorPrice: 200_000,
      },
    ],
  ])(
    'should create a new auction and decrement the initiators balance, increase the protocol balance, and remove the reserved name for valid contractTxIds',
    (interactionInput, expectedData) => {
      const inputData = {
        ...getBaselineState(),
        reserved: {
          'test-new-auction': {
            target: 'initiator',
          },
        },
        balances: {
          initiator: expectedData.floorPrice,
          'stubbed-contract-id': 0,
        },
      };
      const { state } = submitAuctionBid(inputData, {
        caller: 'initiator',
        input: {
          name: 'test-new-auction',
          ...interactionInput,
        },
      });
      expect(state).toEqual({
        ...getBaselineState(),
        balances: {
          initiator: 0,
          'stubbed-contract-id': expectedData.floorPrice,
        },
        auctions: {
          'test-new-auction': {
            contractTxId: expectedData.contractTxId,
            endHeight: 101,
            type: expectedData.type,
            startHeight: 1,
            initiator: 'initiator',
            startPrice:
              expectedData.floorPrice *
              baselineAuctionSettings.startPriceMultiplier,
            floorPrice: expectedData.floorPrice,
            ...(interactionInput.type === 'lease' ? { years: 1 } : {}),
            settings: {
              ...baselineAuctionSettings,
            },
          },
        },
      });
    },
  );

  it('should throw an insufficient balance error when a second bidder attempts to bid on an auction with insufficient funds', () => {
    const inputData: IOState = {
      ...getBaselineState(),
      ...baselineAuctionState,
      balances: {
        'new-bidder': 0,
        'stubbed-contract-id': 0,
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
      ...getBaselineState(),
      ...baselineAuctionState,
      balances: {
        'new-bidder': 1_000,
        'stubbed-contract-id': 0,
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
      ...getBaselineState(),
      auctions: {
        'test-auction-close': {
          ...baselineAuctionData,
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

  it.each([
    [
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'lease',
        floorPrice: 100,
        startPrice: 1000,
      },
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'lease',
        undernames: 10,
        startTimestamp: 1,
      },
    ],
    [
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'permabuy',
        floorPrice: 100,
        startPrice: 1000,
      },
      {
        contractTxId: 'stubbed-transaction-id',
        type: 'permabuy',
        undernames: 10,
        startTimestamp: 1,
      },
    ],
  ])(
    'should close out an auction, update records, return balance to initiator, update protocol balance and increase demand factor for the period when a second bidder wins the auction',
    (inputAuctionData, expectedData) => {
      const auction = {
        ...baselineAuctionData,
        ...inputAuctionData,
      } as AuctionData;
      const inputData: IOState = {
        ...getBaselineState(),
        auctions: {
          'test-auction-close': auction,
        },
        balances: {
          'stubbed-contract-id': 100, // assumes the floor price was already given to the protocol balance
          'new-bidder': 1000,
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
        ...getBaselineState(),
        auctions: {},
        records: {
          'test-auction-close': {
            contractTxId: expectedData.contractTxId,
            ...{
              endTimestamp:
                expectedData.type === 'lease'
                  ? 1 + SECONDS_IN_A_YEAR
                  : undefined,
            },
            type: expectedData.type,
            startTimestamp: expectedData.startTimestamp,
            undernames: expectedData.undernames,
            purchasePrice: 1000,
          },
        },
        demandFactoring: {
          ...baselineDemandFactorData,
          purchasesThisPeriod: 1,
        },
        balances: {
          initiator: 100,
          'stubbed-contract-id': 1000,
          'new-bidder': 0,
        },
      });
    },
  );

  it('should close out an auction, update records, return balance to initiator, update protocol balance and increase demand factor for the period when the initiator bids twice and wins the auction', () => {
    const inputData: IOState = {
      ...getBaselineState(),
      ...baselineAuctionState,
      records: {},
      balances: {
        initiator: 900,
        'stubbed-contract-id': 100, // assumes the floor price was already given to the protocol balance
      },
    };
    const { state } = submitAuctionBid(inputData, {
      caller: 'initiator',
      input: {
        name: 'test-auction-close',
        contractTxId: RESERVED_ATOMIC_TX_ID,
      },
    });
    expect(state).toEqual({
      ...getBaselineState(),
      auctions: {},
      records: {
        'test-auction-close': {
          contractTxId: 'stubbed-transaction-id',
          endTimestamp: SECONDS_IN_A_YEAR + 1,
          type: 'lease',
          startTimestamp: 1,
          undernames: 10,
          purchasePrice: 1000,
        },
      },
      demandFactoring: {
        ...baselineDemandFactorData,
        purchasesThisPeriod: 1,
      },
      balances: {
        initiator: 0,
        'stubbed-contract-id': 1000,
      },
    });
  });
});
