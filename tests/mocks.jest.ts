// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../src/globals.d.ts" />

// mock implementation for unit tests

(SmartWeave as any) = {
  block: {
    height: 0,
    timestamp: 0,
  },
  contract: {
    id: 'stubbed-contract-id',
  },
  transaction: {
    id: 'stubbed-transaction-id',
  },
};
// map it to a standard error
ContractError = Error;
