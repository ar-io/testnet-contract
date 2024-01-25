import {
  AUCTION_SETTINGS,
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  GENESIS_FEES,
  INITIAL_DEMAND_FACTOR_DATA,
  INITIAL_EPOCH_DISTRIBUTION_DATA,
} from '../constants';
import { ArNSLeaseAuctionData, Gateway, Gateways, IOState } from '../types';

export const stubbedArweaveTxId = 'thevalidtransactionidthatis43characterslong';

export const getBaselineState: () => IOState = (): IOState => ({
  ticker: 'ARNS-TEST',
  name: 'Arweave Name System Test',
  canEvolve: true,
  owner: '',
  evolve: '',
  records: {},
  balances: {},
  vaults: {},
  distributions: {
    // intentionally spread as we don't want to reference the object directly
    ...INITIAL_EPOCH_DISTRIBUTION_DATA,
  },
  reserved: {},
  fees: GENESIS_FEES,
  auctions: {},
  settings: {
    registry: {
      minLockLength: 720,
      maxLockLength: 788400,
      minNetworkJoinStakeAmount: 10000,
      minGatewayJoinLength: 1,
      gatewayLeaveLength: 1,
      operatorStakeWithdrawLength: 3600,
    },
    auctions: AUCTION_SETTINGS,
  },
  gateways: {},
  lastTickedHeight: 0,
  observations: {},
  demandFactoring: {
    // intentionally spread as we don't want to reference the object directly
    ...INITIAL_DEMAND_FACTOR_DATA,
  },
});

export const stubbedAuctionData: ArNSLeaseAuctionData = {
  startHeight: 1,
  startPrice: 1_000,
  endHeight: 101,
  floorPrice: 100,
  type: 'lease',
  initiator: 'initiator',
  contractTxId: 'contractTxId',
  years: 1,
  settings: AUCTION_SETTINGS,
};

export const stubbedAuctionState: Partial<IOState> = {
  auctions: {
    'test-auction-close': {
      ...stubbedAuctionData,
    },
  },
};

export const stubbedGatewayData: Gateway = {
  observerWallet: 'test-observer-wallet',
  start: 0,
  end: 0,
  vaults: {},
  operatorStake: 10_000,
  settings: {
    label: 'test-gateway',
    fqdn: 'test.com',
    port: 443,
    protocol: 'https',
  },
  status: 'joined',
  stats: {
    // intentionally spread as we don't want to reference the object directly
    ...DEFAULT_GATEWAY_PERFORMANCE_STATS,
  },
};

export const stubbedGateways: Gateways = {
  'a-gateway': {
    ...stubbedGatewayData,
    operatorStake: 100,
    observerWallet: 'a-gateway-observer',
  },
  'a-gateway-2': {
    ...stubbedGatewayData,
    operatorStake: 200,
    observerWallet: 'a-gateway-observer-2',
  },
  'a-gateway-3': {
    ...stubbedGatewayData,
    operatorStake: 300,
    observerWallet: 'a-gateway-observer-3',
  },
};
