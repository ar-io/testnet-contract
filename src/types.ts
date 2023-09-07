import { PstState } from 'warp-contracts';

import {
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS,
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
    // a registry of all gateways
    [address: string]: Gateway; // each gateway uses its public arweave wallet address to identify it in the gateway registry
  };
  // A list of all fees for purchasing ArNS names
  fees: Fees;
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
  // auctions
  auctions: {
    [name: string]: Auction;
  };
};

export type Fees = {
  [nameLength: string]: number;
};

export type Auction = {
  startPrice: number;
  floorPrice: number;
  startHeight: number;
  auctionSettingsId: string;
  type: 'lease' | 'permabuy';
  initiator: string;
  contractTxId: string;
  years?: number;
};

export type AuctionSettings = {
  id: string;
  floorPriceMultiplier: number; // if we ever want to drop prices
  // premiumNameFloorPrice: number; // the floor price for names marked as premium
  startPriceMultiplier: number;
  auctionDuration: number;
  decayRate: number;
  decayInterval: number;
};

export type ContractSettings = {
  // these settings control the various capabilities in the contract
  registry: {
    minLockLength: number; // the minimum amount of blocks tokens can be locked in a community vault
    maxLockLength: number; // the maximum amount of blocks tokens can be locked in a community vault
    minNetworkJoinStakeAmount: number; // the minimum amount of tokens needed to stake to join the ar.io network as a gateway
    minGatewayJoinLength: number; // the minimum amount of blocks a gateway can be joined to the ar.io network
    gatewayLeaveLength: number; // the amount of blocks that have to elapse before a gateway leaves the network
    operatorStakeWithdrawLength: number; // the amount of blocks that have to elapse before a gateway operator's stake is returned
  };
  auctions: {
    current: string;
    history: AuctionSettings[];
  };
};

const gatewayStatus = [
  NETWORK_JOIN_STATUS,
  NETWORK_HIDDEN_STATUS,
  NETWORK_LEAVING_STATUS,
] as const;
export type GatewayStatus = typeof gatewayStatus[number];

export type Gateway = {
  operatorStake: number; // the total stake of this gateway's operator.
  start: number; // At what block the gateway joined the network.
  end: number; // At what block the gateway can leave the network.  0 means no end date.
  status: GatewayStatus; // hidden represents not leaving, but not participating
  vaults: TokenVault[]; // the locked tokens staked by this gateway operator
  settings: GatewaySettings;
};

export type GatewaySettings = {
  // All of the settings related to this gateway
  label: string; // The friendly name used to label this gateway
  fqdn: string; // the fully qualified domain name this gateway can be reached at. eg arweave.net
  port: number; // The port used by this gateway eg. 443
  protocol: AllowedProtocols; // The protocol used by this gateway, either http or https
  properties?: string; // An Arweave transaction ID containing additional properties of this gateway
  note?: string; // An additional note (256 character max) the gateway operator can set to indicate things like maintenance or other operational updates.
};

export type AllowedProtocols = 'http' | 'https';

export type ArNSName = {
  contractTxId: string; // The ANT Contract used to manage this name
  startTimestamp: number; // At what unix time (seconds since epoch) the lease starts
  endTimestamp?: number; // At what unix time (seconds since epoch) the lease ends
  type: 'lease' | 'permabuy';
  undernames: number;
};

export type ReservedName = {
  target?: string; // The target wallet address this name is reserved for
  endTimestamp?: number; // At what unix time (seconds since epoch) this reserved name becomes available
};

export type Foundation = {
  // The settings and wallets used by the AR.IO Foundation.
  actionPeriod: number; // the amount of blocks that must pass for all signers to approve a transfer
  minSignatures: number; // the minimum amount of signatures/approvals needed to move funds, must be less than the amount of total addresses
  addresses: string[]; // All of the foundation managed wallet addresses
  actions: FoundationAction[]; // A list of all on-chain actions performed by the foundation
};

export type FoundationAction = {
  id: string; // the id number for this action
  type: FoundationActionType; // the specific kind of action being performed
  status: FoundationActionStatus; // the latest status of this action
  startHeight: number; // the block height that this action started at
  value: FoundationActionInput; // the value for setting a specific configuration
  note: string; // a description of this foundation action
  signed: string[]; // a list of the foundation wallets that have signed this action
};

export type WalletAddress = string;
export type ValidStringInput = string;
export type FeesInput = { [nameLength: string]: number };
export type FoundationActionInput =
  | WalletAddress
  | ValidStringInput
  | FeesInput
  | DelayedEvolveInput;

const foundationActionStatus = [
  FOUNDATION_ACTION_ACTIVE_STATUS,
  FOUNDATION_ACTION_PASSED_STATUS,
  FOUNDATION_ACTION_FAILED_STATUS,
  FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS,
] as const;
export type FoundationActionStatus = typeof foundationActionStatus[number];

export type FoundationActionType =
  | 'setMinSignatures'
  | 'setActionPeriod'
  | 'addAddress'
  | 'removeAddress'
  | 'setNameFees'
  | 'delayedEvolve';

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
  input: any;
  caller: string;
};

export type DelayedEvolveInput = {
  contractSrcTxId: string; // The source code that this contract will evolve to
  evolveHeight?: number; // The height at which this evolution action takes effect
};

export type PstResult = {
  target: string;
  balance: number;
};

export type ArNSNameResult = {
  name: string;
  contractTxId: string; // The ANT Contract used to manage this name
  endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
};

export type PstFunctions = 'balance' | 'transfer' | 'evolve';

export type PDNSFunctions = 'buyRecord' | 'extendRecord' | 'setName' | 'record';

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
  | 'updateGatewaySettings';

export type FoundationFunctions = 'foundationAction';

export type IOContractFunctions = FoundationFunctions &
  GARFunctions &
  PDNSFunctions &
  PstFunctions;

export type ContractResult =
  | { state: IOState }
  | { result: PstResult }
  | { result: ArNSNameResult }
  | {
      result: {
        [x: string | number]: any;
      };
    };
