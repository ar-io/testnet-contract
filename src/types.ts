import { PstState } from 'warp-contracts';

import {
  NETWORK_HIDDEN_STATUS,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
} from './constants.js';

// TODO: add InputValidator class that can be extended for specific methods

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
  vaults: {
    // a list of all vaults that have locked balances
    [address: string]: TokenVault[];
    // a wallet can have multiple vaults
  };
  // auctions
  auctions: {
    [name: string]: Auction;
  };
  observation: ObservationReports;
};

// The health reports and failure summaries submitted by observers for an epoch
export type ObservationReports = {
  [epochStartHeight: number]: {
    // the starting height of the epoch that this report is for
    summaries: {
      [failedGatewayAddress: string]: string[]; // the gateway that has been marked as down and the gateways that marked it down
    };
    reports: {
      [observerAddress: string]: string; // the observer's publc address and the observation report transaction id
    };
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
export type GatewayStatus = (typeof gatewayStatus)[number];

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

export type WalletAddress = string;

export type TokenVault = {
  balance: number; // Positive integer, the amount locked
  start: number; // At what block the lock starts.
  end: number; // At what block the lock ends.  0 means no end date.
};

export type VaultParameters = {
  balance: number;
  start: number;
  end: number;
};

export type PstAction = {
  input: any; // eslint-disable-line
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

export type ArNSFunctions =
  | 'buyRecord'
  | 'extendRecord'
  | 'setName'
  | 'record'
  | 'submitAuctionBid';

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

export type ObservationFunctions = 'saveObservations';

export type IOContractFunctions = ObservationFunctions &
  GARFunctions &
  ArNSFunctions &
  PstFunctions;

export type ContractResult =
  | { state: IOState }
  | { result: PstResult }
  | { result: ArNSNameResult }
  | {
      result: {
        [x: string | number]: any; // eslint-disable-line
      };
    };
