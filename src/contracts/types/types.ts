// ~~ Write types for your contract ~~
export interface ArNSState {
  ticker: string; // A short token symbol, shown in block explorers and marketplaces
  name: string; // The friendly name of the token, shown in block explorers and marketplaces
  owner: string; // The owner of this contract who can execute specific methods
  foundation: {
    // The settings and wallets used by the AR.IO Foundation
    balance: number; // the amount of funds held by the foundation, collection from AR.IO services like ArNS
    actionPeriod: number; // the amount of blocks that must pass for all signers to approve a transfer
    minSignatures: number; // the minimum amount of signatures/approvals needed to move funds, must be less than the amount of total addresses
    addresses: string[]; // All of the foundation managed wallet addresses
    actions: FoundationActionInterface[];
  };
  settings: {
    [name: string]: number;
  };
  evolve: string; // The new Smartweave Source Code transaction to evolve this contract to
  records: {
    // A list of all names and their corresponding attributes
    [name: string]: {
      tier: number; // The tier of service that has been purchased
      contractTxId: string; // The ANT Contract used to manage this name
      endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
      maxSubdomains: number; // The maximum number of subdomains allowed for this name, based on the tier purchased
      minTtlSeconds: number; // The minimum number of seconds allowed for the TTL, based on tier purchased
    };
  };
  balances: {
    // A list of all outstanding, positive, token balances
    [address: string]: number;
  };
  vaults: {
    // a list of all vaults that have locked balances
    [address: string]: [
      // a walelt can have multiple vaults
      {
        balance: number; // Positive integer, the amount held in this vault
        start: number; // At what block the lock starts.
        end: number; // At what block the lock ends.
      }
    ];
  };
  fees: {
    // A list of all fees for purchasing ArNS names
    [nameLength: string]: number;
  };
  approvedANTSourceCodeTxs: string[]; // An array of Smartweave Source Code transactions for whitelisted ANTs
  tiers: {
    // Different ArNS tiers provide different capabilities for a premium cost
    [tier: number]: {
      maxSubdomains: number; // The maximum number of subdomains allowed for this tier
      minTtlSeconds: number; // The minimum number of seconds allowed for the TTL for this tier
    };
  };
}

export interface PstAction {
  input: PstInput;
  caller: string;
}

export interface PstInput {
  type: FoundationActionType;
  function: PstFunction;
  target: string;
  value: string | number;
  name: string;
  contractTxId: string;
  years: number;
  qty: number;
  tier: number;
  maxSubdomains: number;
  minTtlSeconds: number;
  note: string;
  recipient: string;
  lockLength: number;
  id: number;
  fees: {
    [nameLength: string]: number;
  };
}

export interface FoundationActionInterface {
  id?: number;
  type: FoundationActionType;
  status?: FoundationActionStatus;
  start?: number;
  totalSignatures?: number;
  target?: string;
  value?: string | number;
  recipient?: string;
  qty?: number;
  note?: string;
  signed?: string[];
  lockLength?: number;
}

export type FoundationActionStatus = "active" | "passed" | "failed";
export type FoundationActionType =
  | "transfer"
  | "setMinSignatures"
  | "setActionPeriod"
  | "addAddress"
  | "removeAddress";

export interface PstResult {
  target: string;
  balance: number;
}

export interface ArNSNameResult {
  name: string; // The
  tier: number; // The tier of service that has been purchased
  contractTxId: string; // The ANT Contract used to manage this name
  endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
  maxSubdomains: number; // The maximum number of subdomains allowed for this name, based on the tier purchased
  minTtlSeconds: number; // The minimum number of seconds allowed for the TTL for this tier
}

export type PstFunction =
  | "transfer"
  | "transferLocked"
  | "mint"
  | "setFees"
  | "evolve"
  | "buyRecord"
  | "extendRecord"
  | "setTier"
  | "upgradeTier"
  | "removeRecord"
  | "addANTSourceCodeTx"
  | "removeANTSourceCodeTx"
  | "balance"
  | "record"
  | "initiateFoundationAction"
  | "approveFoundationAction"
  | "lock"
  | "unlock"
  | "increaseVaultBalance"
  | "increaseVaultLength";

export type ContractResult =
  | { state: ArNSState }
  | { result: PstResult }
  | { result: ArNSNameResult };
