import { PstState } from 'warp-contracts';

import {
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  NETWORK_HIDDEN_STATUS,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
} from './constants.js';

export type IOState = PstState & {
  name: string; // The friendly name of the token, shown in block explorers and marketplaces
  evolve: string; // The new Smartweave Source Code transaction to evolve this contract to
  records: {
    // A list of all names and their corresponding attributes
    [name: string]: ArNSName;
  };
  gateways: {
    // a list of all registered gateways
    [address: string]: Gateway; // each gateway uses its public arweave wallet address to identify it in the gateway registry
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
  settings: ContractSettings; // protocol settings and parameters
  reserved: {
    // A list of all reserved names that are not allowed to be purchased at this time
    [name: string]: ReservedName;
  };
  foundation: Foundation; // set of foundation wallets and controls used to sign actions to manage the smartweave contract
  vaults: {
    // a list of all vaults that have locked balances
    [address: string]: TokenVault[];
    // a wallet can have multiple vaults
  };
};

export type ContractSettings = {
  // these settings can be modified via on-chain governance
  minLockLength: number; // the minimum amount of blocks tokens can be locked in a community vault
  maxLockLength: number; // the maximum amount of blocks tokens can be locked in a community vault
  minNetworkJoinStakeAmount: number; // the minimum amount of tokens needed to stake to join the ar.io network as a gateway
  minDelegatedStakeAmount: number; // the minimum amount of tokens needed to delegate stake to an ar.io network gateway
  minGatewayJoinLength: number; // the minimum amount of blocks a gateway can be joined to the ar.io network
  gatewayLeaveLength: number; // the amount of blocks that have to elapse before a gateway leaves the network
  delegatedStakeWithdrawLength: number; // the amount of blocks that have to elapse before a delegated stake is returned
  operatorStakeWithdrawLength: number; // the amount of blocks that have to elapse before a gateway operator's stake is returned
};

const gatewayStatus = [
  NETWORK_JOIN_STATUS,
  NETWORK_HIDDEN_STATUS,
  NETWORK_LEAVING_STATUS,
] as const;
export type GatewayStatus = typeof gatewayStatus[number];

export type Gateway = {
  operatorStake: number; // the total stake of this gateway's operator.
  delegatedStake: number; // the total stake of this gateway's delegates.
  start: number; // At what block the gateway joined the network.
  end: number; // At what block the gateway can leave the network.  0 means no end date.
  status: GatewayStatus; // hidden represents not leaving, but not participating
  vaults: TokenVault[]; // the locked tokens staked by this gateway operator
  delegates: {
    // The delegates that have staked tokens with this gateway
    [address: string]: TokenVault[];
  };
  settings: GatewaySettings;
};

export type GatewaySettings = {
  // All of the settings related to this gateway
  label: string; // The friendly name used to label this gateway
  fqdn: string; // the fully qualified domain name this gateway can be reached at. eg arweave.net
  port: number; // The port used by this gateway eg. 443
  protocol: AllowedProtocols; // The protocol used by this gateway, either http or https
  openDelegation: boolean; // If true, community token holders can delegate stake to this gateway
  delegateAllowList: string[]; // A list of allowed arweave wallets that can act as delegates, if empty then anyone can delegate their tokens to this gateway
  note?: string; // An additional note (256 character max) the gateway operator can set to indicate things like maintenance or other operational updates.
};

export type AllowedProtocols = 'http' | 'https';

export type ArNSName = {
  contractTxId: string; // The ANT Contract used to manage this name
  endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
  tier: string; // The id of the tier selected at time of purchased
};

export type ReservedName = {
  target?: string; // The target wallet address this name is reserved for
  endTimestamp?: number; // At what unix time (seconds since epoch) this reserved name becomes available
};

export type Foundation = {
  // The settings and wallets used by the AR.IO Foundation.  This is for testing purposes only
  balance: number; // the amount of funds held by the foundation multi sig vault, collection from AR.IO services like ArNS
  actionPeriod: number; // the amount of blocks that must pass for all signers to approve a transfer
  minSignatures: number; // the minimum amount of signatures/approvals needed to move funds, must be less than the amount of total addresses
  addresses: string[]; // All of the foundation managed wallet addresses
  actions: FoundationAction[]; // A list of all on-chain actions performed by the foundation
};

export type FoundationAction = {
  id: number; // the id number for this action
  type: FoundationActionType; // the specific kind of action being performed
  status: FoundationActionStatus; // the latest status of this action
  start: number; // the block height that this action started at
  target?: string; // the target wallet used by this foundation action
  value?: string | number; // the value for setting a specific configuration
  qty?: number; // the amount of tokens distributed from the foundation balance
  note: string; // a description of this foundation action
  signed: string[]; // a list of the foundation wallets that have signed this action
  lockLength?: number; // determines the amount of blocks a foundation balance distribution is locked for
};

const foundationActionStatus = [
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
] as const;
export type FoundationActionStatus = typeof foundationActionStatus[number];

export type FoundationActionType =
  | 'transfer'
  | 'transferLocked'
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

// TODO: break this up
export type PstInput = {
  type: FoundationActionType;
  function: IOContractFunctions;
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
  lockLength: number;
  id: number;
  fees: {
    [nameLength: string]: number;
  };
  label: string;
  fqdn: string;
  port: number;
  protocol: AllowedProtocols;
  penalty: number;
  settings: ContractSettings;
  openDelegation: boolean;
  delegateAllowList: string[];
  version: string;
  status: string;
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

export type PstFunctions = 'balance' | 'transfer' | 'evolve';

export type PDNSFunctions =
  | 'setFees'
  | 'buyRecord'
  | 'removeRecord'
  | 'extendRecord'
  | 'addANTSourceCodeTx'
  | 'removeANTSourceCodeTx'
  | 'setName'
  | 'setActiveTier'
  | 'createNewTier'
  | 'tier'
  | 'activeTiers'
  | 'upgradeTier'
  | 'record';

export type GARFunctions =
  | 'joinNetwork'
  | 'gatewayRegistry'
  | 'gatewayTotalStake'
  | 'initiateLeave'
  | 'finalizeLeave'
  | 'increaseOperatorStake'
  | 'rankedGatewayRegistry'
  | 'initiateOperatorStakeDecrease'
  | 'finalizeOperatorStakeDecrease'
  | 'updateGatewaySettings'
  | 'initiateFoundationAction'
  | 'signFoundationAction';

export type FoundationFunctions = 'gateway' | 'updateState' | 'mint';

export type IOContractFunctions = FoundationFunctions &
  GARFunctions &
  PDNSFunctions &
  PstFunctions;

export type ContractResult =
  | { state: IOState }
  | { result: PstResult }
  | { result: ArNSNameResult };
