import { PstState } from 'warp-contracts';

export type IOState = PstState & {
  name: string; // The friendly name of the token, shown in block explorers and marketplaces
  evolve: string; // The new Smartweave Source Code transaction to evolve this contract to
  records: {
    // A list of all names and their corresponding attributes
    [name: string]: ArNSName;
  };
  fees: {
    // A list of all fees for purchasing ArNS names
    [nameLength: string]: number;
  };
  tiers: {
    current: {
      [x: number]: string;
    };
    history: ServiceTier[];
  };
  approvedANTSourceCodeTxs: string[]; // An array of Smartweave Source Code transactions for whitelisted ANTs
};

export type ContractSettings = {
  // these settings can be modified via on-chain governance
  lockMinLength: number; // the minimum amount of blocks tokens can be locked in a community vault
  lockMaxLength: number; // the maximum amount of blocks tokens can be locked in a community vault
  minGatewayStakeAmount: number; // the minimum amount of tokens needed to stake to join the ar.io network as a gateway
  minDelegatedStakeAmount: number; // the minimum amount of tokens needed to delegate stake to an ar.io network gateway
  gatewayJoinLength: number; // the minimum amount of blocks a gateway can be joined to the ar.io network
  gatewayLeaveLength: number; // the amount of blocks that have to elapse before a gateway leaves the network
  delegatedStakeWithdrawLength: number; // the amount of blocks that have to elapse before a delegated stake is returned
  operatorStakeWithdrawLength: number; // the amount of blocks that have to elapse before a delegated stake is returned
};

export type Gateway = {
  operatorStake: number; // the total stake of this gateway's operator.
  delegatedStake: number; // the total stake of this gateway's delegates.
  settings: GatewaySettings;
  vaults: [TokenVault]; // the locked tokens staked by this gateway operator
  delegates: {
    // The delegates that have staked tokens with this gateway
    [address: string]: [TokenVault];
  };
};
export type GatewaySettings = {
  // All of the settings related to this gateway
  label: string; // The friendly name used to label this gateway
  sslFingerprint: string; // the SHA-256 Fingerprint used by SSL certificate used by this gateway eg. 5C 5D 05 16 C3 3C A3 34 51 78 1E 67 49 14 D4 66 31 A9 19 3C 63 8E F9 9E 54 84 1A F0 4C C2 1A 36
  ipV4Address?: string; // the IP address this gateway can be reached at eg. 10.124.72.100
  url: string; // the fully qualified domain name this gateway can be reached at. eg arweave.net
  port: number; // The port used by this gateway eg. 443
  protocol: AllowedProtocols; // The protocol used by this gateway, either http or https
  openDelegation?: boolean; // If true, community token holders can delegate stake to this gateway
  delegateAllowList?: string[]; // A list of allowed arweave wallets that can act as delegates, if empty then anyone can delegate their tokens to this gateway
  note?: string; // An additional note (256 character max) the gateway operator can set to indicate things like maintenance or other operational updates.
};

export type AllowedProtocols = 'http' | 'https';

export type ArNSName = {
  contractTxId: string; // The ANT Contract used to manage this name
  endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
  tier: string; // The id of the tier selected at time of purchased
};

// export type Foundation= {
//   // The settings and wallets used by the AR.IO Foundation.  This is for testing purposes only
//   balance: number; // the amount of funds held by the foundation, collection from AR.IO services like ArNS
//   actionPeriod: number; // the amount of blocks that must pass for all signers to approve a transfer
//   minSignatures: number; // the minimum amount of signatures/approvals needed to move funds, must be less than the amount of total addresses
//   addresses: string[]; // All of the foundation managed wallet addresses
//   actions: FoundationAction[]; // A list of all on-chain actions performed by the foundation
// }

// export type FoundationAction= {
//   id?: number; // the id number for this action
//   type: FoundationActionType; // the specific kind of action being performed
//   status?: FoundationActionStatus; // the latest status of this action
//   start?: number; // the block height that this action started at
//   totalSignatures?: number; // the amount of signatures collected for this action
//   target?: string; // the target wallet added to the foundation addresses list
//   value?: string | number; // the value for setting a specific configuration
//   recipient?: string; // the target recipient of a foundation balance distribution
//   qty?: number; // the amount of tokens distributed from the foundation balance
//   note?: string; // a description of this foundation action
//   signed?: string[]; // a list of the foundation wallets that have signed this action
//   lockLength?: number; // determines the amount of blocks a foundation balance distribution is locked for
// }

export type FoundationActionStatus = 'active' | 'passed' | 'failed';
export type FoundationActionType =
  | 'transfer'
  | 'setMinSignatures'
  | 'setActionPeriod'
  | 'addAddress'
  | 'removeAddress';

export type TokenVault = {
  balance: number; // Positive integer, the amount locked
  start: number; // At what block the lock starts.
  end: number; // At what block the lock ends.  0 means no end date.
};

export type VaultParamstype = {
  balance: number;
  start: number;
  end: number;
};

export type Votetype = {
  status?: VoteStatus;
  type: VoteType;
  id?: number;
  totalWeight?: number;
  recipient?: string;
  target?: string;
  qty?: number;
  key?: string;
  value?: number | string;
  note?: string;
  yays?: number;
  nays?: number;
  voted?: string[];
  start?: number;
  lockLength?: number;
};

export type VoteStatus = 'active' | 'quorumFailed' | 'passed' | 'failed';
export type VoteType =
  | 'mint'
  | 'mintLocked'
  | 'burnVault'
  | 'indicative'
  | 'set';

export type PstAction = {
  input: PstInput;
  caller: string;
};

export type ArNSNamePurchase = {
  name: string;
  years: number;
  tierNumber?: number;
  contractTxId: string;
};

export type PstInput = {
  type: FoundationActionType;
  function: PstFunction;
  target: string;
  value: string | number;
  name: string;
  contractTxId: string;
  newTier: {
    fee: number;
    settings: ServiceTierSettings;
  };
  fee: number;
  years: number;
  qty: number;
  tierNumber: number;
  tierId: string;
  note: string;
  recipient: string;
  lockLength: number;
  id: number;
  fees: {
    [nameLength: string]: number;
  };
  label: string;
  sslFingerprint: string;
  ipV4Address?: string;
  url: string;
  port: number;
  protocol: AllowedProtocols;
  penalty: number;
  settings: ContractSettings;
  openDelegation: boolean;
  delegateAllowList: string[];
  version: string;
};

export type PstResult = {
  target: string;
  balance: number;
};

export type ArNSNameResult = {
  name: string;
  contractTxId: string; // The ANT Contract used to manage this name
  endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
  tier: ServiceTier; // Maps to the service tier
};

export type ServiceTier = {
  id?: string;
  fee: number;
  settings: ServiceTierSettings;
};

// any tier settings offered
export type ServiceTierSettings = {
  maxUndernames: number;
};

// TODO: handle purchasing additional undernames
export type PstFunction =
  | 'transfer'
  | 'transferLocked'
  | 'mint'
  | 'setFees'
  | 'evolve'
  | 'buyRecord'
  | 'removeRecord'
  | 'extendRecord'
  | 'addANTSourceCodeTx'
  | 'removeANTSourceCodeTx'
  | 'getBalance'
  | 'getRecord'
  | 'updateState'
  | 'setName'
  | 'setActiveTier'
  | 'createNewTier'
  | 'getTier'
  | 'getActiveTiers'
  | 'upgradeTier';

export type ContractResult =
  | { state: IOState }
  | { result: PstResult }
  | { result: ArNSNameResult };
