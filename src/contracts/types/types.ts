// ~~ Write types for your contract ~~
export interface ArNSState {
  ticker: string;
  name: string;
  owner: string;
  evolve: string;
  records: {
    [name: string]: string;
  }
  balances: {
    [address: string]: number;
  };
  fees: {
    [nameLength: string]: number;
  };
}

export interface PstAction {
  input: PstInput;
  caller: string;
}

export interface PstInput {
  function: PstFunction;
  target: string;
  value: string;
  name: string;
  contractTransactionId: string;
  qty: number;
  fees: {
    [nameLength: string]: number;
  }
}

export interface PstResult {
  target: string;
  ticker: string;
  balance: number;
}

export interface ArNSNameResult {
  name: string;
  contractTransactionId: string;
}

export type PstFunction = "transfer" | "mint" | "setFees" | "evolve" | "buyRecord" | "removeRecord" | "balance" | "record";

export type ContractResult = { state: ArNSState } | { result: PstResult } | {result: ArNSNameResult};
