import {
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  GENESIS_FEES,
  INITIAL_DEMAND_FACTOR_DATA,
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
    epochZeroStartHeight: 0,
    epochStartHeight: 0,
    epochEndHeight: EPOCH_BLOCK_LENGTH - 1,
    epochPeriod: 0,
    nextDistributionHeight: EPOCH_BLOCK_LENGTH - 1 + EPOCH_DISTRIBUTION_DELAY,
  },
  reserved: {},
  fees: GENESIS_FEES,
  auctions: {},
  gateways: {},
  lastTickedHeight: 0,
  observations: {},
  demandFactoring: {
    // intentionally spread as we don't want to reference the object directly
    ...INITIAL_DEMAND_FACTOR_DATA,
  },
  settings: undefined,
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
