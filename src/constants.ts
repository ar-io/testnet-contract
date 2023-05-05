export const MAX_DELEGATES = 1000; // the maximum amount of delegates that can be added to a single gateway
export const MAX_YEARS = 3; // the maximum amount of years an arns name could be leased for
export const MAX_NAME_LENGTH = 32; // the maximum length of an arns name
export const MAX_NOTE_LENGTH = 256; // the maximum size of a note field
export const MAX_GATEWAY_LABEL_LENGTH = 16; // the maximum size of a label field
export const MAX_PORT_NUMBER = 65535; // the default end port of tcp/udp port numbers
export const MAX_FOUNDATION_ACTION_PERIOD = 720 * 30; // the maximum amount of time (in blocks) a foundation action could be set to
export const TX_ID_LENGTH = 43; // the length of an arweave transaction id
export const SECONDS_IN_A_YEAR = 31_536_000; // 52 weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const SECONDS_IN_GRACE_PERIOD = 1_814_400; // Three weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const RESERVED_ATOMIC_TX_ID = 'atomic';
export const FOUNDATION_ACTION_ACTIVE_STATUS = 'active';
export const FOUNDATION_ACTION_FAILED_STATUS = 'failed';
export const FOUNDATION_ACTION_PASSED_STATUS = 'passed';
export const FOUNDATION_EVOLUTION_COMPLETE_STATUS = 'evolved';
export const NETWORK_JOIN_STATUS = 'joined';
export const NETWORK_LEAVING_STATUS = 'leaving';
export const NETWORK_HIDDEN_STATUS = 'hidden';
export const MAX_ALLOWED_EVOLUTION_DELAY = 720 * 30;
export const MINIMUM_ALLOWED_EVOLUTION_DELAY = 2; // 2 blocks for testing purposes, but should be 720 * 7; // 720 blocks per day times 7 days
export const MINIMUM_ALLOWED_NAME_LENGTH = 5; // names less than 5 characters are reserved for auction
export const DEFAULT_UNDERNAMES_COUNT = 10;
export const ALLOWED_ACTIVE_TIERS = [1, 2, 3];
export const DEFAULT_ANNUAL_PERCENTAGE_FEE = 0.1; // 10% of cost of name
export const DEFAULT_UNDERNAME_REGISTRATION_IO_FEE = 1; // 1 IO token per undername
export const DEFAULT_NON_CONTRACT_OWNER_MESSAGE = `Caller is not the owner of the ArNS!`;
export const DEFAULT_INVALID_ARNS_NAME_MESSAGE = 'Invalid ArNS Record Name';
export const DEFAULT_ARNS_NAME_RESERVED_MESSAGE = 'Name is reserved.';
export const DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE = `Names shorter than ${MINIMUM_ALLOWED_NAME_LENGTH} characters must be reserved in order to be purchased.`;
export const DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE =
  'This name already exists in an active lease';
export const DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE =
  'Name does not exist in the ArNS Contract!';
export const DEFAULT_EXISTING_ANT_SOURCE_CODE_TX_MESSAGE =
  'This ANT Source Code Transaction ID is already allowed.';
export const DEFAULT_INSUFFICIENT_FUNDS_MESSAGE =
  'Insufficient funds for this transaction.';
export const DEFAULT_INVALID_TARGET_MESSAGE = 'Invalid target specified';
export const DEFAULT_INVALID_QTY_MESSAGE =
  'Invalid quantity. Must be an integer and greater than 0.';
export const DEFAULT_INVALID_TIER_MESSAGE = 'Invalid tier.';
export const DEFAULT_INVALID_ID_TIER_MESSAGE =
  'Invalid tier ID. Must be present in state before it can be used as a current tier.';
export const DEFAULT_INVALID_YEARS_MESSAGE = `Invalid number of years. Must be an integer and less than ${MAX_YEARS}`;
export const DEFAULT_TIERS = [
  {
    id: 'a27dbfe4-6992-4276-91fb-5b97ae8c3ffa',
    fee: 100,
    settings: {
      maxUndernames: 100,
    },
  },
  {
    id: '93685bbb-8246-4e7e-bef8-d2e7e6c5d44a',
    fee: 1000,
    settings: {
      maxUndernames: 1000,
    },
  },
  {
    id: 'b6c8ee18-2481-4c1b-886c-dbe6b606486a',
    fee: 10000,
    settings: {
      maxUndernames: 10000,
    },
  },
];
export const DEFAULT_FEE_STRUCTURE = {
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
};
