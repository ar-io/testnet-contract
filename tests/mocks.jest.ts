// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../src/globals.d.ts" />

// mock implementation for unit tests
SmartWeave = {
  block: {
    height: 1,
    timestamp: 1,
  },
  contract: {
    id: 'stubbed-contract-id',
  },
  transaction: {
    id: 'stubbed-transaction-id',
  },
  // tests should implement their own mocks for safeArweaveGet depending on their needs and avoid a global mock that could hide potential bugs
  safeArweaveGet: jest.fn().mockRejectedValue('safeArweaveGet not implemented'),
};

// map it to a standard error
ContractError = Error;
