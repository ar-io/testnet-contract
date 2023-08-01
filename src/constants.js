'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AUCTION_SETTINGS =
  exports.AUCTION_SETTINGS_ID =
  exports.FEE_STRUCTURE =
  exports.TIERS =
  exports.CURRENT_TIERS =
  exports.INVALID_SHORT_NAME =
  exports.INVALID_YEARS_MESSAGE =
  exports.INVALID_ID_TIER_MESSAGE =
  exports.INVALID_TIER_MESSAGE =
  exports.INVALID_QTY_MESSAGE =
  exports.INVALID_TARGET_MESSAGE =
  exports.INSUFFICIENT_FUNDS_MESSAGE =
  exports.EXISTING_ANT_SOURCE_CODE_TX_MESSAGE =
  exports.ARNS_NAME_DOES_NOT_EXIST_MESSAGE =
  exports.NON_EXPIRED_ARNS_NAME_MESSAGE =
  exports.INVALID_INPUT_MESSAGE =
  exports.ARNS_NAME_RESERVED_MESSAGE =
  exports.INVALID_ARNS_NAME_MESSAGE =
  exports.NON_CONTRACT_OWNER_MESSAGE =
  exports.UNDERNAME_REGISTRATION_IO_FEE =
  exports.ANNUAL_PERCENTAGE_FEE =
  exports.ALLOWED_ACTIVE_TIERS =
  exports.UNDERNAMES_COUNT =
  exports.MINIMUM_ALLOWED_NAME_LENGTH =
  exports.MINIMUM_ALLOWED_EVOLUTION_DELAY =
  exports.MAX_ALLOWED_EVOLUTION_DELAY =
  exports.SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP =
  exports.NETWORK_HIDDEN_STATUS =
  exports.NETWORK_LEAVING_STATUS =
  exports.NETWORK_JOIN_STATUS =
  exports.FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS =
  exports.FOUNDATION_ACTION_PASSED_STATUS =
  exports.FOUNDATION_ACTION_FAILED_STATUS =
  exports.FOUNDATION_ACTION_ACTIVE_STATUS =
  exports.RESERVED_ATOMIC_TX_ID =
  exports.SECONDS_IN_GRACE_PERIOD =
  exports.SECONDS_IN_A_YEAR =
  exports.TX_ID_LENGTH =
  exports.MAX_FOUNDATION_ACTION_PERIOD =
  exports.MAX_PORT_NUMBER =
  exports.MAX_GATEWAY_LABEL_LENGTH =
  exports.MAX_NOTE_LENGTH =
  exports.MAX_NAME_LENGTH =
  exports.MAX_YEARS =
  exports.MAX_DELEGATES =
    void 0;
exports.MAX_DELEGATES = 1000; // the maximum amount of delegates that can be added to a single gateway
exports.MAX_YEARS = 3; // the maximum amount of years an arns name could be leased for
exports.MAX_NAME_LENGTH = 32; // the maximum length of an arns name
exports.MAX_NOTE_LENGTH = 256; // the maximum size of a note field
exports.MAX_GATEWAY_LABEL_LENGTH = 16; // the maximum size of a label field
exports.MAX_PORT_NUMBER = 65535; // the default end port of tcp/udp port numbers
exports.MAX_FOUNDATION_ACTION_PERIOD = 720 * 30; // the maximum amount of time (in blocks) a foundation action could be set to
exports.TX_ID_LENGTH = 43; // the length of an arweave transaction id
exports.SECONDS_IN_A_YEAR = 31536000; // 52 weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
exports.SECONDS_IN_GRACE_PERIOD = 1814400; // Three weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
exports.RESERVED_ATOMIC_TX_ID = 'atomic';
exports.FOUNDATION_ACTION_ACTIVE_STATUS = 'active';
exports.FOUNDATION_ACTION_FAILED_STATUS = 'failed';
exports.FOUNDATION_ACTION_PASSED_STATUS = 'passed';
exports.FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS = 'evolved';
exports.NETWORK_JOIN_STATUS = 'joined';
exports.NETWORK_LEAVING_STATUS = 'leaving';
exports.NETWORK_HIDDEN_STATUS = 'hidden';
exports.SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP = 1704092400000; // January 1st, 2024
exports.MAX_ALLOWED_EVOLUTION_DELAY = 720 * 30;
exports.MINIMUM_ALLOWED_EVOLUTION_DELAY = 3; // 3 blocks for testing purposes, but should be 720 * 7; // 720 blocks per day times 7 days
exports.MINIMUM_ALLOWED_NAME_LENGTH = 5; // names less than 5 characters are reserved for auction
exports.UNDERNAMES_COUNT = 10;
exports.ALLOWED_ACTIVE_TIERS = [1, 2, 3];
exports.ANNUAL_PERCENTAGE_FEE = 0.1; // 10% of cost of name
exports.UNDERNAME_REGISTRATION_IO_FEE = 1; // 1 IO token per undername
exports.NON_CONTRACT_OWNER_MESSAGE = 'Caller is not the owner of the ArNS!';
exports.INVALID_ARNS_NAME_MESSAGE = 'Invalid ArNS Record Name';
exports.ARNS_NAME_RESERVED_MESSAGE = 'Name is reserved.';
exports.INVALID_INPUT_MESSAGE = 'Invalid input for interaction';
exports.NON_EXPIRED_ARNS_NAME_MESSAGE =
  'This name already exists in an active lease';
exports.ARNS_NAME_DOES_NOT_EXIST_MESSAGE =
  'Name does not exist in the ArNS Contract!';
exports.EXISTING_ANT_SOURCE_CODE_TX_MESSAGE =
  'This ANT Source Code Transaction ID is already allowed.';
exports.INSUFFICIENT_FUNDS_MESSAGE = 'Insufficient funds for this transaction.';
exports.INVALID_TARGET_MESSAGE = 'Invalid target specified';
exports.INVALID_QTY_MESSAGE =
  'Invalid quantity. Must be an integer and greater than 0.';
exports.INVALID_TIER_MESSAGE = 'Invalid tier.';
exports.INVALID_ID_TIER_MESSAGE =
  'Invalid tier ID. Must be present in state before it can be used as a current tier.';
exports.INVALID_YEARS_MESSAGE =
  'Invalid number of years. Must be an integer and less than or equal to '.concat(
    exports.MAX_YEARS,
  );
exports.INVALID_SHORT_NAME = 'Name is less than '
  .concat(
    exports.MINIMUM_ALLOWED_NAME_LENGTH,
    ' characters. It will be available for auction after ',
  )
  .concat(exports.SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP, '.');
exports.CURRENT_TIERS = [
  'a27dbfe4-6992-4276-91fb-5b97ae8c3ffa',
  '93685bbb-8246-4e7e-bef8-d2e7e6c5d44a',
  'b6c8ee18-2481-4c1b-886c-dbe6b606486a',
];
exports.TIERS = {
  current: exports.CURRENT_TIERS,
  history: [
    {
      id: exports.CURRENT_TIERS[0],
      fee: 100,
      settings: {
        maxUndernames: 100,
      },
    },
    {
      id: exports.CURRENT_TIERS[1],
      fee: 1000,
      settings: {
        maxUndernames: 1000,
      },
    },
    {
      id: exports.CURRENT_TIERS[2],
      fee: 10000,
      settings: {
        maxUndernames: 10000,
      },
    },
  ],
};
exports.FEE_STRUCTURE = {
  1: 4218750000,
  2: 1406250000,
  3: 468750000,
  4: 156250000,
  5: 62500000,
  6: 25000000,
  7: 10000000,
  8: 5000000,
  9: 1000000,
  10: 500000,
  11: 450000,
  12: 400000,
  13: 350000,
  14: 300000,
  15: 250000,
  16: 200000,
  17: 175000,
  18: 150000,
  19: 125000,
  20: 100000,
  21: 75000,
  22: 50000,
  23: 250000,
  24: 12500,
  25: 6750,
  26: 3375,
  27: 1000,
  28: 500,
  29: 250,
  30: 125,
  31: 100,
  32: 50,
};
exports.AUCTION_SETTINGS_ID = '3IkWJ-0HdwuATDhBXuJRm0bWspXOOkRjxTm-5R2xRbw';
exports.AUCTION_SETTINGS = {
  current: exports.AUCTION_SETTINGS_ID,
  history: [
    {
      id: exports.AUCTION_SETTINGS_ID,
      floorPriceMultiplier: 2,
      startPriceMultiplier: 200,
      decayInterval: 60,
      decayRate: 0.05,
      auctionDuration: 5040, // approx 7 days long
    },
  ],
};
