import { AuctionSettings } from './types';

export const SECONDS_IN_A_YEAR = 31_536_000; // 52 weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const MAX_YEARS = 5; // the maximum amount of years an arns name could be leased for
export const MIN_YEARS = 1; // the minimum amount of years an arns name could be leased for
export const NAMESPACE_LENGTH = 62; // browser domains are max 63 characters between periods, but we need to leave 1 character for the underscore seperator between the undernames and arns name
export const MAX_NAME_LENGTH = 51; // the maximum length of an arns name - gateway sandbox domains are 52 characters, so to prevent overlap we stop 1 character short, where the 52nd character would be an underscore (which sandbox domains do not use) to prevent overlap
export const MAX_NOTE_LENGTH = 256; // the maximum size of a note field
export const MAX_GATEWAY_LABEL_LENGTH = 64; // the maximum size of a gtaeway label field used in the GAR
export const MAX_PORT_NUMBER = 65535; // the default end port of tcp/udp port numbers
export const TX_ID_LENGTH = 43; // the length of an arweave transaction id
export const SECONDS_IN_GRACE_PERIOD = 1_814_400; // Three weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const RESERVED_ATOMIC_TX_ID = 'atomic';
export const NETWORK_JOIN_STATUS = 'joined';
export const NETWORK_LEAVING_STATUS = 'leaving';
export const NETWORK_HIDDEN_STATUS = 'hidden';
export const SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP = 1704092400000; // January 1st, 2024
export const MAX_ALLOWED_EVOLUTION_DELAY = 720 * 30;
export const MINIMUM_ALLOWED_EVOLUTION_DELAY = 3; // 3 blocks for testing purposes, but should be 720 * 7; // 720 blocks per day times 7 days
export const MINIMUM_ALLOWED_NAME_LENGTH = 5; // names less than 5 characters are reserved for auction
export const RARITY_MULTIPLIER_HALVENING = 25;
export const PERMABUY_LEASE_FEE_LENGTH = 10;
export const ANNUAL_PERCENTAGE_FEE = 0.1; // 10% of cost of name
export const DEFAULT_UNDERNAME_COUNT = 10;
export const MAX_ALLOWED_UNDERNAMES = 10_000; // when modifying these, update the undernames schema
export const UNDERNAME_REGISTRATION_IO_FEE = 1; // 1 IO token per undername
export const NON_CONTRACT_OWNER_MESSAGE = `Caller is not the owner of the ArNS!`;
export const INVALID_ARNS_NAME_MESSAGE = 'Invalid ArNS Record Name';
export const ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE = 'Name must be auctioned.';
export const ARNS_NAME_RESERVED_MESSAGE = 'Name is reserved.';
export const ARNS_NAME_IN_AUCTION_MESSAGE = 'Name is currently in auction.';
export const INVALID_INPUT_MESSAGE = 'Invalid input for interaction';
export const CALLER_NOT_VALID_OBSERVER_MESSAGE =
  'Cannot submit observation report because caller is not elligible to observe';
export const TARGET_GATEWAY_NOT_REGISTERED =
  'Target gateway is not currently registered';
export const INVALID_OBSERVATION_TARGET =
  'Target gateway is leaving the network and must not be observed';
export const DEFAULT_NUM_SAMPLED_BLOCKS = 3;
export const DEFAULT_SAMPLED_BLOCKS_OFFSET = 50;
export const NUM_OBSERVERS_PER_EPOCH = 3;
export const NON_EXPIRED_ARNS_NAME_MESSAGE =
  'This name already exists in an active lease';
export const ARNS_NAME_DOES_NOT_EXIST_MESSAGE =
  'Name does not exist in the ArNS Contract!';
export const EXISTING_ANT_SOURCE_CODE_TX_MESSAGE =
  'This ANT Source Code Transaction ID is already allowed.';
export const INSUFFICIENT_FUNDS_MESSAGE =
  'Insufficient funds for this transaction.';
export const INVALID_TARGET_MESSAGE = 'Invalid target specified';
export const INVALID_QTY_MESSAGE =
  'Invalid quantity. Must be an integer and greater than 0.';
export const INVALID_YEARS_MESSAGE = `Invalid number of years. Must be an integer and less than or equal to ${MAX_YEARS}`;
export const INVALID_NAME_EXTENSION_TYPE_MESSAGE = `This name has been permanently registered and its lease cannot be extended.`;
export const INVALID_SHORT_NAME = `Name is less than ${MINIMUM_ALLOWED_NAME_LENGTH} characters. It will be available for auction after ${SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP}.`;
export const MAX_UNDERNAME_MESSAGE = `Name has reached undername limit of ${MAX_ALLOWED_UNDERNAMES}`;
export const FEE_STRUCTURE = {
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
export const AUCTION_SETTINGS: AuctionSettings = {
  floorPriceMultiplier: 1,
  startPriceMultiplier: 50,
  decayInterval: 30, // decrement every 30 blocks - approx every 1 hour
  decayRate: 0.0225, // 5% decay
  auctionDuration: 5040, // approx 7 days long
};

export const DEFAULT_EPOCH_BLOCK_LENGTH = 50; // 5000 for mainnet
export const DEFAULT_START_HEIGHT = 0;
