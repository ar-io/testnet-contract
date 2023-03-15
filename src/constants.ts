export const url = {
  redstoneGateway: '',
};

export const MAX_DELEGATES = 1000; // the maximum amount of delegates that can be added to a single gateway
export const MAX_YEARS = 3; // the maximum amount of years an arns name could be leased for
export const MAX_NAME_LENGTH = 32; // the maximum length of an arns name
export const MAX_NOTE_LENGTH = 256; // the maximum size of a note field
export const TX_ID_LENGTH = 43; // the length of an arweave transaction id
export const FOUNDATION_PERCENTAGE = 10; // the percentage of arns name purchases that goes to the foundation balance
export const SECONDS_IN_A_YEAR = 31_536_000; // 52 weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const SECONDS_IN_GRACE_PERIOD = 1_814_400; // Three weeks, 7 days per week, 24 hours per day, sixty minutes per hour, sixty seconds per minute
export const RESERVED_ATOMIC_TX_ID = 'atomic';
export const DEFAULT_UNDERNAMES_COUNT = 10;
export const ALLOWED_ACTIVE_TIERS = [1, 2, 3];
export const DEFAULT_ANNUAL_PERCENTAGE_FEE = 0.1; // 10% of cost of name
export const DEFAULT_UNDERNAME_REGISTRATION_IO_FEE = 1; // 1 IO token per undername
export const DEFAULT_NON_CONTRACT_OWNER_MESSAGE=`Caller is not the owner of the ArNS!`;
export const DEFAULT_INVALID_ARNS_NAME_MESSAGE='Invalid ArNS Record Name';
export const DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE='This name already exists in an active lease';
export const DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE='Name does not exist in the ArNS!';
export const DEFAULT_EXISTING_ANT_SOURCE_CODE_TX_MESSAGE='This ANT Source Code Transaction ID is already allowed.'
// The mainnet wallet that will be used in the creation of contracts, ants and record purchases.
export const keyfile = '';

// The Redstone Testnet wallet that will be used in the creation of contracts, ants and record purchases.
export const testKeyfile = '';
