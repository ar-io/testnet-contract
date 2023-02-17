// ~~ Write types for your contract ~~
export interface ArNSState {
  ticker: string; // A short token symbol, shown in block explorers and marketplaces
  name: string; // The friendly name of the token, shown in block explorers and marketplaces
  owner: string; // The owner of this contract who can execute specific methods
  evolve: string; // The new Smartweave Source Code transaction to evolve this contract to
  records: {
    // A list of all friendly names and their corresponding ANT adresses
    [name: string]: string;
  };
  balances: {
    // A list of all outstanding, positive, token balances
    [address: string]: number;
  };
  fees: {
    // A list of all fees for purchasing ArNS names
    [nameLength: string]: number;
  };
  approvedANTSourceCodeTxs: string[]; // An array of Smartweave Source Code transactions for whitelisted ANTs
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
  };
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

export type PstFunction =
  | 'transfer'
  | 'mint'
  | 'setFees'
  | 'evolve'
  | 'buyRecord'
  | 'removeRecord'
  | 'addANTSourceCodeTx'
  | 'removeANTSourceCodeTx'
  | 'balance'
  | 'record';

export type ContractResult =
  | { state: ArNSState }
  | { result: PstResult }
  | { result: ArNSNameResult };
