import {
  AuctionSettings,
  BlockHeight,
  DemandFactoringData,
  DemandFactoringSettings,
  EpochDistributionData,
  Fees,
  GatewayPerformanceStats,
  IOToken,
} from './types';

/**
 * BASE CONTROLS
 */
export const TOTAL_IO_SUPPLY = new IOToken(1_000_000_000).toMIO(); // 1 billion IO tokens
export const SECONDS_IN_A_YEAR = 31_536_000; // 52 weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const MAX_ALLOWED_DECIMALS = 6; // the maximum allowed decimals for the IO Token
export const BLOCKS_PER_DAY = 720;

/**
 * GATEWAY REGISTRY CONTROLS
 */
// TODO: continue to convert these to block heights and mIO token
export const MAX_GATEWAY_LABEL_LENGTH = 64; // the maximum size of a gateway label field used in the GAR
export const MAX_PORT_NUMBER = 65535; // the default end port of tcp/udp port numbers
export const GATEWAY_LEAVE_BLOCK_LENGTH = new BlockHeight(90 * BLOCKS_PER_DAY); // 90 DAYS
export const GATEWAY_REDUCE_STAKE_BLOCK_LENGTH = 30 * BLOCKS_PER_DAY; // 30 DAYS
export const MAX_TOKEN_LOCK_BLOCK_LENGTH = 12 * 365 * BLOCKS_PER_DAY; // The maximum amount of blocks tokens can be locked in a vault (12 years of blocks)
export const MIN_TOKEN_LOCK_BLOCK_LENGTH = 14 * BLOCKS_PER_DAY; // The minimum amount of blocks tokens can be locked in a vault (14 days of blocks)
export const MINIMUM_ALLOWED_NAME_LENGTH = 5; // names less than 5 characters are reserved for auction
export const NETWORK_JOIN_STATUS = 'joined';
export const NETWORK_LEAVING_STATUS = 'leaving';
export const MIN_OPERATOR_STAKE = new IOToken(10_000).toMIO(); // Minimum amount of tokens needed to join the network as a gateway operator
export const MIN_DELEGATED_STAKE = new IOToken(100).toMIO(); // The minimum amount of tokens needed to delegate to another gateway on the network - mainnet will be 500
export const DELEGATED_STAKE_UNLOCK_LENGTH = new BlockHeight(
  30 * BLOCKS_PER_DAY,
); // 30 DAYS
export const MAX_DELEGATES = 10_000; // The maximum number of delegated stakers for a single gateway. TODO: Consider ramifications of many delegated stakers
export const GATEWAY_REGISTRY_SETTINGS = {
  gatewayLeaveLength: new BlockHeight(3600), // approximately 5 days
  maxLockLength: new BlockHeight(788400),
  minGatewayJoinLength: new BlockHeight(3600), // TODO: remove this as gatewayLeaveLength achieves the same thing
  minLockLength: new BlockHeight(720), // 1 day
  operatorStakeWithdrawLength: new BlockHeight(3600), // TODO: bump to 90 days
  // TODO: add delegatedStakeWithdrawLength to 30 days
};

/**
 * OBSERVER WEIGHTS
 */
export const MAX_TENURE_WEIGHT = 4; // 4 - 6 month periods mark you as a mature gateway
export const TENURE_WEIGHT_DAYS = 180; // the amount of days in a single tenure weight period used to calculate composite weights for observation
export const TENURE_WEIGHT_PERIOD = TENURE_WEIGHT_DAYS * BLOCKS_PER_DAY; // the # of blocks in a single tenure weight period (6-months) used to calculate composite weights for observation

/**
 * ARNS CONTROLS
 */
export const ARNS_LEASE_LENGTH_MAX_YEARS = 5; // the maximum amount of years an arns name could be leased for
export const ARNS_LEASE_LENGTH_MIN_YEARS = 1; // the minimum amount of years an arns name could be leased for
export const RESERVED_ATOMIC_TX_ID = 'atomic';
export const SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP = 1725080400000; // August 31st, 2024
export const PERMABUY_LEASE_FEE_LENGTH = 10;
export const ANNUAL_PERCENTAGE_FEE = 0.2; // 20% of cost of name
export const DEFAULT_UNDERNAME_COUNT = 10;
export const UNDERNAME_LEASE_FEE_PERCENTAGE = 0.001; // .1% of cost of name
export const UNDERNAME_PERMABUY_FEE_PERCENTAGE = 0.005; // .5% of cost of name
export const MAX_ALLOWED_UNDERNAMES = 10_000; // when modifying these, update the undernames schema
export const UNDERNAME_REGISTRATION_IO_FEE = 1; // 1 IO token per undername
export const MAX_NAME_LENGTH = 51; // the maximum length of an arns name - gateway sandbox domains are 52 characters, so to prevent overlap we stop 1 character short, where the 52nd character would be an underscore (which sandbox domains do not use) to prevent overlap
export const MAX_NOTE_LENGTH = 256; // the maximum size of a note field
export const SECONDS_IN_GRACE_PERIOD = 1_814_400; // Three weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const GENESIS_FEES: Fees = {
  '1': 4218750000,
  '2': 1406250000,
  '3': 468750000,
  '4': 156250000,
  '5': 62500000,
  '6': 25000000,
  '7': 10000000,
  '8': 5000000,
  '9': 1000000,
  '10': 500000,
  '11': 450000,
  '12': 400000,
  '13': 350000,
  '14': 300000,
  '15': 250000,
  '16': 200000,
  '17': 175000,
  '18': 150000,
  '19': 125000,
  '20': 100000,
  '21': 75000,
  '22': 50000,
  '23': 250000,
  '24': 12500,
  '25': 6750,
  '26': 3375,
  '27': 1000,
  '28': 500,
  '29': 250,
  '30': 125,
  '31': 100,
  '32': 50,
  '33': 50,
  '34': 50,
  '35': 50,
  '36': 50,
  '37': 50,
  '38': 50,
  '39': 50,
  '40': 50,
  '41': 50,
  '42': 50,
  '43': 50,
  '44': 50,
  '45': 50,
  '46': 50,
  '47': 50,
  '48': 50,
  '49': 50,
  '50': 50,
  '51': 50,
};
// initial names reserved by the contract owner
export const RESERVED_NAMES = [
  'arns',
  'ar-io',
  'gateway',
  'help',
  'io',
  'nodes',
  'ar',
  'cookbook',
  'www',

  // currently owned
  'arns',
  'search',
  'docs',
  'admin',
];
// the auction settings applied to all auctions
export const AUCTION_SETTINGS: AuctionSettings = {
  floorPriceMultiplier: 1,
  startPriceMultiplier: 50,
  exponentialDecayRate: 0.000002,
  scalingExponent: 190,
  auctionDuration: 10_080, // approx 14 days long
};
// the demand factoring settings used to determine when to step down - criteria specifies whether accounting is revenue or purchase count based
export const DEMAND_FACTORING_SETTINGS: DemandFactoringSettings = {
  movingAvgPeriodCount: 7,
  periodBlockCount: 720,
  demandFactorBaseValue: 1,
  demandFactorMin: 0.5,
  demandFactorUpAdjustment: 0.05,
  demandFactorDownAdjustment: 0.025,
  stepDownThreshold: 3, // number of times at minimum allowed before resetting genesis fees (ultimately leads to 4 periods at the new fee, including the reset period)
  criteria: 'revenue',
};

export const INITIAL_DEMAND_FACTOR_DATA: DemandFactoringData = {
  periodZeroBlockHeight: 0,
  currentPeriod: 0,
  trailingPeriodPurchases: [0, 0, 0, 0, 0, 0, 0],
  trailingPeriodRevenues: [0, 0, 0, 0, 0, 0, 0],
  purchasesThisPeriod: 0,
  revenueThisPeriod: 0,
  demandFactor: 1,
  consecutivePeriodsWithMinDemandFactor: 0,
};

/**
 * ERROR MESSAGES
 */
export const NON_CONTRACT_OWNER_MESSAGE = `Caller is not the owner of the ArNS!`;
export const ARNS_INVALID_NAME_MESSAGE = 'Invalid ArNS Record Name';
export const ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE = 'Name must be auctioned.';
export const ARNS_NAME_RESERVED_MESSAGE = 'Name is reserved.';
export const ARNS_NAME_IN_AUCTION_MESSAGE = 'Name is currently in auction.';
export const ARNS_NAME_AUCTION_EXPIRED_MESSAGE = 'Auction has expired.';
export const ARNS_NON_EXPIRED_NAME_MESSAGE =
  'This name already exists in an active lease';
export const ARNS_NAME_DOES_NOT_EXIST_MESSAGE =
  'Name does not exist in the ArNS Contract!';
export const ARNS_MAX_UNDERNAME_MESSAGE = `Name has reached undername limit of ${MAX_ALLOWED_UNDERNAMES}`;
export const ARNS_INVALID_YEARS_MESSAGE = `Invalid number of years. Must be an integer and less than or equal to ${ARNS_LEASE_LENGTH_MAX_YEARS}`;
export const ARNS_INVALID_SHORT_NAME = `Name is less than ${MINIMUM_ALLOWED_NAME_LENGTH} characters. It will be available for auction after ${SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP}.`;
export const ARNS_INVALID_EXTENSION_MESSAGE = `This name has been permanently registered and its lease cannot be extended.`;

export const INVALID_VAULT_LOCK_LENGTH_MESSAGE = `Invalid lock length. Must be between ${MIN_TOKEN_LOCK_BLOCK_LENGTH} - ${MAX_TOKEN_LOCK_BLOCK_LENGTH}.`;
export const INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE =
  'Invalid caller. Observer does not exist as an observer address in the gateway registry.';
export const INVALID_OBSERVATION_CALLER_MESSAGE =
  'Invalid caller. Caller is not eligible to submit observation reports for this epoch.';
export const INVALID_GATEWAY_STAKE_AMOUNT_MESSAGE = `Quantity must be greater than or equal to the minimum network join stake amount.`;
export const INVALID_OBSERVER_WALLET =
  'Invalid observer wallet. The provided observer wallet is correlated with another gateway.';
export const INVALID_GATEWAY_REGISTERED_MESSAGE =
  'Target gateway is not currently registered';
export const INVALID_OBSERVATION_TARGET_MESSAGE =
  'Target gateway is leaving the network and must not be observed';
export const INVALID_GATEWAY_EXISTS_MESSAGE =
  'A gateway with this address already exists.';
export const INSUFFICIENT_FUNDS_MESSAGE =
  'Insufficient funds for this transaction.';
export const INVALID_TARGET_MESSAGE = 'Invalid target specified';
export const INVALID_QTY_MESSAGE =
  'Invalid quantity. Must be an integer and greater than 0.';
export const INVALID_INPUT_MESSAGE = 'Invalid input for interaction';

/**
 * OBSERVATION AND DISTRIBUTIONS
 */
export const INITIAL_PROTOCOL_BALANCE = 5_000_000; // 5 million IO tokens
export const OBSERVERS_SAMPLED_BLOCKS_COUNT = 3; // the number of blocks we sample when calculating the base hash for prescribed observers
export const OBSERVERS_SAMPLED_BLOCKS_OFFSET = 50; // the number of blocks offset from the current epoch start height we sample when calculating the base hash for prescribed observers
export const EPOCH_BLOCK_LENGTH = 720; // TODO: make this 5000 for mainnet
export const EPOCH_DISTRIBUTION_DELAY = 15; // the number of blocks we wait before distributing rewards, protects against potential forks
export const EPOCH_REWARD_PERCENTAGE = 0.0025; // 0.25% of total available protocol balance
export const GATEWAY_PERCENTAGE_OF_EPOCH_REWARD = 0.95; // total percentage of protocol balance that goes to gateways
export const OBSERVER_PERCENTAGE_OF_EPOCH_REWARD =
  1 - GATEWAY_PERCENTAGE_OF_EPOCH_REWARD; // total percentage of protocol balance that goes to observers
export const OBSERVATION_FAILURE_THRESHOLD = 0.5; // 50% + 1 of the network must report a gateway as failed for it to not receive rewards
export const BAD_OBSERVER_GATEWAY_PENALTY = 0.25; // 25% of the gateway's stake is slashed for bad observation reports
export const MAXIMUM_OBSERVERS_PER_EPOCH = 50; // the maximum number of prescribed observers per epoch
export const MAXIMUM_OBSERVER_CONSECUTIVE_FAIL_COUNT = 21; // the number of consecutive epochs an observer can fail before being removed from the network
export const EPOCH_BLOCK_ZERO_START_HEIGHT = 1350700; // testnet start height, update this for mainnet
export const DEFAULT_GATEWAY_PERFORMANCE_STATS: GatewayPerformanceStats = {
  passedEpochCount: 0,
  failedConsecutiveEpochs: 0,
  totalEpochParticipationCount: 0,
  submittedEpochCount: 0,
  totalEpochsPrescribedCount: 0,
};
export const INITIAL_EPOCH_DISTRIBUTION_DATA: EpochDistributionData = {
  epochZeroStartHeight: EPOCH_BLOCK_ZERO_START_HEIGHT,
  epochStartHeight: EPOCH_BLOCK_ZERO_START_HEIGHT,
  epochEndHeight: EPOCH_BLOCK_ZERO_START_HEIGHT + EPOCH_BLOCK_LENGTH - 1,
  epochPeriod: 0,
  nextDistributionHeight:
    EPOCH_BLOCK_ZERO_START_HEIGHT +
    EPOCH_BLOCK_LENGTH -
    1 +
    EPOCH_DISTRIBUTION_DELAY,
};
