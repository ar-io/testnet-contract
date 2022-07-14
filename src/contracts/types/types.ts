// ~~ Write types for your contract ~~
export interface ArNSState {
  ticker: string; // A short token symbol, shown in block explorers and marketplaces
  name: string;   // The friendly name of the token, shown in block explorers and marketplaces
  owner: string;  // The owner of this contract who can execute specific methods
  evolve: string; // The new Smartweave Source Code transaction to evolve this contract to
  records: {     // A list of all names and their corresponding attributes
    [name: string]: {
      tier: number, // The tier of service that has been purchased
      contractTxId: string, // The ANT Contract used to manage this name
      endTimestamp: number, // At what unix time (seconds since epoch) the lease ends
      maxSubdomains: number // The maximum number of subdomains allowed for this name, based on the tier purchased
    }
  };
  balances: {     // A list of all outstanding, positive, token balances
    [address: string]: number;
  };
  fees: {         // A list of all fees for purchasing ArNS names
    [nameLength: string]: number;
  };
  approvedANTSourceCodeTxs: string[]; // An array of Smartweave Source Code transactions for whitelisted ANTs
  tiers: { // Different ArNS tiers provide different capabilities for a premium cost
    [tier: number]: { 
      maxSubdomains: number // The maximum number of subdomains allowed for this tier
    }
  };
};

export interface PstAction {
  input: PstInput;
  caller: string;
}

export interface PstInput {
  function: PstFunction;
  target: string;
  value: string;
  name: string;
  contractTxId: string;
  years: number;
  qty: number;
  tier: number;
  fees: {
    [nameLength: string]: number;
  }
};

export interface PstResult {
  target: string;
  ticker: string;
  balance: number;
};

export interface ArNSNameResult {
  name: string;
  contractTxId: string;
  endTimestamp: number;
  maxSubdomains: number;
};

export type PstFunction = "transfer" | "mint" | "setFees" | "evolve" | "buyRecord" | "extendRecord" | "removeRecord" | "addANTSourceCodeTx" | "removeANTSourceCodeTx" | "balance" | "record";

export type ContractResult = { state: ArNSState } | { result: PstResult } | {result: ArNSNameResult};
