import { PstState } from 'warp-contracts';

import {
  MAX_ALLOWED_DECIMALS,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
} from './constants';

export type WalletAddress = string;
export type TransactionId = string;
export type DemandFactoringData = {
  periodZeroBlockHeight: number; // TODO: The block height at which the contract was initialized
  currentPeriod: number;
  trailingPeriodPurchases: number[]; // Acts as a ring buffer of trailing period purchase counts
  trailingPeriodRevenues: number[]; // Acts as a ring buffer of trailing period revenues
  purchasesThisPeriod: number;
  revenueThisPeriod: number;
  demandFactor: number;
  consecutivePeriodsWithMinDemandFactor: number;
};

// TODO: add InputValidator class that can be extended for specific methods
export type ArNSName = string;
export type Epoch = number;
export type Observations = Record<Epoch, EpochObservations>;
export type Balances = Record<WalletAddress, number>;
export type Gateways = Record<WalletAddress, Gateway>;
export type Records = Record<ArNSName, ArNSNameData>; // TODO: create ArNS Name type
export type ReservedNames = Record<ArNSName, ReservedNameData>;
export type Auctions = Record<ArNSName, ArNSAuctionData>;
export type Fees = Record<string, number>;
export type Vaults = Record<TransactionId, VaultData>;
export type Delegates = Record<WalletAddress, DelegateData>;
export type RegistryVaults = Record<WalletAddress, Vaults>;
export type PrescribedObservers = Record<Epoch, WeightedObserver[]>;

// TODO: we may choose to not extend PstState. It provides additional functions with warp (e.g. const contract = warp.pst(contractTxId).transfer())
export interface IOState extends PstState {
  balances: Balances;
  name: string; // The friendly name of the token, shown in block explorers and marketplaces
  records: Records; // The list of all ArNS names and their associated data
  gateways: Gateways; // each gateway uses its public arweave wallet address to identify it in the gateway registry
  fees: Fees; // starting list of all fees for purchasing ArNS names
  reserved: ReservedNames; // list of all reserved names that are not allowed to be purchased at this time
  auctions: Auctions;
  lastTickedHeight: number; // periodicity management
  demandFactoring: DemandFactoringData;
  observations: Observations;
  distributions: EpochDistributionData;
  vaults: RegistryVaults;
  prescribedObservers: PrescribedObservers;
}

export type GatewayPerformanceStats = {
  totalEpochParticipationCount: number; // the total number of epochs this gateway has participated in
  passedEpochCount: number; // the number of epochs this gateway has passed
  failedConsecutiveEpochs: number; // the number of consecutive epochs this gateway has failed
  submittedEpochCount: number; // the number of epochs this observer has submitted reports for
  totalEpochsPrescribedCount: number; // the total number of epochs this observer was prescribed to submit reports for
};

// The distributions made at the end of each epoch
export type EpochDistributionData = {
  epochZeroStartHeight: number;
  epochStartHeight: number; // the current epoch start height
  epochEndHeight: number; // the current epoch end height
  epochPeriod: number;
  nextDistributionHeight: number;
};

export type ObserverAddress = WalletAddress;
export type FailedGatewayAddress = WalletAddress;
export type EpochObservations = {
  failureSummaries: Record<ObserverAddress, FailedGatewayAddress[]>; // an observers summary of all failed gateways in the epoch
  reports: Record<ObserverAddress, TransactionId>; // a reference point for the report submitted by this observer
};

// The health reports and failure failureSummaries submitted by observers for an epoch
export type ObserverWeights = {
  stakeWeight: number;
  tenureWeight: number;
  gatewayRewardRatioWeight: number;
  observerRewardRatioWeight: number;
  compositeWeight: number;
  normalizedCompositeWeight: number;
};
export type WeightedObserver = {
  gatewayAddress: string;
  observerAddress: string;
  stake: number;
  start: number;
} & ObserverWeights;

export type ArNSBaseAuctionData = {
  startPrice: number;
  floorPrice: number;
  startHeight: number;
  endHeight: number;
  type: RegistrationType;
  initiator: string;
  contractTxId: string;
};

export type ArNSLeaseAuctionData = ArNSBaseAuctionData & {
  type: 'lease';
  years: 1;
};

export type ArNSPermabuyAuctionData = ArNSBaseAuctionData & {
  type: 'permabuy';
};

export type ArNSAuctionData = ArNSLeaseAuctionData | ArNSPermabuyAuctionData;

export type AuctionSettings = {
  floorPriceMultiplier: number;
  startPriceMultiplier: number;
  scalingExponent: number; // the constant used to scale the price of the auction
  auctionDuration: number;
  exponentialDecayRate: number; // the rate at which the price drops for each block
};

export type GatewayRegistrySettings = {
  minLockLength: number; // the minimum amount of blocks tokens can be locked in a community vault
  maxLockLength: number; // the maximum amount of blocks tokens can be locked in a community vault
  minOperatorStake: number; // the minimum amount of tokens needed to stake to join the ar.io network as a gateway
  // TODO: remove this number - it's achieved by gatewayLeaveLength
  minGatewayJoinLength: number; // the minimum amount of blocks a gateway can be joined to the ar.io network
  gatewayLeaveLength: number; // the amount of blocks that have to elapse before a gateway leaves the network
  operatorStakeWithdrawLength: number; // the amount of blocks that have to elapse before a gateway operator's stake is returned
  // TODO: add delegatedStakeWithdrawLength for delegated staking
};

// TODO: these will be moved to constants
export type DelegateData = {
  delegatedStake: number;
  start: number; // At what block this delegate began their stake
  vaults: Vaults; // the locked tokens staked by this gateway operator
};

const gatewayStatus = [NETWORK_JOIN_STATUS, NETWORK_LEAVING_STATUS] as const;
export type GatewayStatus = (typeof gatewayStatus)[number];

export type Gateway = {
  operatorStake: number; // the total stake of this gateway's operator.
  totalDelegatedStake: number; // the total stake of this gateway's delegates
  observerWallet: WalletAddress; // the wallet address used to save observation reports
  start: number; // At what block the gateway joined the network.
  end: number; // At what block the gateway can leave the network.  0 means no end date.
  status: GatewayStatus; // hidden represents not leaving, but not participating
  vaults: Vaults; // the locked tokens staked by this gateway operator
  delegates: Delegates; // the delegates who have staked tokens with this gateway
  settings: GatewaySettings;
  stats: GatewayPerformanceStats;
};

export type GatewaySettings = {
  label: string; // The friendly name used to label this gateway
  fqdn: string; // the fully qualified domain name this gateway can be reached at. eg arweave.net
  port: number; // The port used by this gateway eg. 443
  protocol: AllowedProtocols; // The protocol used by this gateway, either http or https
  properties?: string; // An Arweave transaction ID containing additional properties of this gateway
  autoStake: boolean; // If true, rewards that gateways earned will be automatically restaked in their gateway
  allowDelegatedStaking?: boolean; // If true, other token holders can delegate their stake to this gateway
  delegateRewardShareRatio?: number; // Number between 0-100 indicating the percent of gateway and observer rewards given to delegates eg. 30 is 30% distributed to delegates
  // allowedDelegates?: string[]; // A list of allowed arweave wallets that can act as delegates, if empty then anyone can delegate their tokens to this gateway
  minDelegatedStake: number; // The minimum delegated stake for this gateway - TODO: make this required and set it on joinNetwork
  note?: string; // An additional note (256 character max) the gateway operator can set to indicate things like maintenance or other operational updates.
};

export type DemandFactoringCriteria = 'purchases' | 'revenue';
export type DemandFactoringSettings = {
  movingAvgPeriodCount: number;
  periodBlockCount: number;
  demandFactorBaseValue: number;
  demandFactorMin: number;
  demandFactorUpAdjustment: number;
  demandFactorDownAdjustment: number;
  stepDownThreshold: number;
  criteria: DemandFactoringCriteria;
};

export type AllowedProtocols = 'http' | 'https';
export type RegistrationType = 'lease' | 'permabuy';

export type ArNSBaseNameData = {
  contractTxId: string; // The ANT Contract used to manage this name
  startTimestamp: number; // At what unix time (seconds since epoch) the lease starts
  type: RegistrationType;
  undernames: number;
  purchasePrice: number;
};

export type ArNSPermabuyData = ArNSBaseNameData & {
  type: 'permabuy';
};

export type ArNSLeaseData = ArNSBaseNameData & {
  type: 'lease';
  endTimestamp: number; // At what unix time (seconds since epoch) the lease ends
};

export type ArNSNameData = ArNSPermabuyData | ArNSLeaseData;

export type ReservedNameData = {
  target?: string; // The target wallet address this name is reserved for
  endTimestamp?: number; // At what unix time (seconds since epoch) this reserved name becomes available
};

export type VaultData = {
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

export type BaseFunctions = 'balance' | 'transfer' | 'evolve';

export type VaultFunctions =
  | 'vaultedTransfer'
  | 'createVault'
  | 'extendVault'
  | 'increaseVault';

export type ArNSFunctions =
  | 'buyRecord'
  | 'extendRecord'
  | 'setName'
  | 'record'
  | 'submitAuctionBid';

export type RegistryFunctions =
  | 'joinNetwork'
  | 'leaveNetwork'
  | 'gateway'
  | 'gateways'
  | 'increaseOperatorStake'
  | 'initiateOperatorStakeDecrease'
  | 'updateGatewaySettings'
  | 'delegateStake'
  | 'decreaseDelegateStake';

export type ObservationFunctions = 'saveObservations' | 'prescribedObservers';

export type IOContractFunctions = BaseFunctions &
  ObservationFunctions &
  RegistryFunctions &
  ArNSFunctions &
  BaseFunctions &
  VaultFunctions;

export type ContractWriteResult = { state: IOState };
// TODO: make this a union type of all the possible return types
export type ContractReadResult = {
  result: unknown;
};

export interface Equatable<T> {
  equals(other: T): boolean;
}

export class PositiveFiniteInteger implements Equatable<PositiveFiniteInteger> {
  constructor(private readonly positiveFiniteInteger: number) {
    if (
      !Number.isFinite(this.positiveFiniteInteger) ||
      !Number.isInteger(this.positiveFiniteInteger) ||
      this.positiveFiniteInteger < 0
    ) {
      throw new ContractError(
        `Number must be a non-negative integer value! ${positiveFiniteInteger}`,
      );
    }
  }

  [Symbol.toPrimitive](hint?: string): number | string {
    if (hint === 'string') {
      this.toString();
    }

    return this.positiveFiniteInteger;
  }

  plus(positiveFiniteInteger: PositiveFiniteInteger): PositiveFiniteInteger {
    return new PositiveFiniteInteger(
      this.positiveFiniteInteger + positiveFiniteInteger.positiveFiniteInteger,
    );
  }

  minus(positiveFiniteInteger: PositiveFiniteInteger): PositiveFiniteInteger {
    return new PositiveFiniteInteger(
      this.positiveFiniteInteger - positiveFiniteInteger.positiveFiniteInteger,
    );
  }

  isGreaterThan(positiveFiniteInteger: PositiveFiniteInteger): boolean {
    return (
      this.positiveFiniteInteger > positiveFiniteInteger.positiveFiniteInteger
    );
  }

  isGreaterThanOrEqualTo(
    positiveFiniteInteger: PositiveFiniteInteger,
  ): boolean {
    return (
      this.positiveFiniteInteger >= positiveFiniteInteger.positiveFiniteInteger
    );
  }

  isLessThan(positiveFiniteInteger: PositiveFiniteInteger): boolean {
    return (
      this.positiveFiniteInteger < positiveFiniteInteger.positiveFiniteInteger
    );
  }

  isLessThanOrEqualTo(positiveFiniteInteger: PositiveFiniteInteger): boolean {
    return (
      this.positiveFiniteInteger <= positiveFiniteInteger.positiveFiniteInteger
    );
  }

  toString(): string {
    return `${this.positiveFiniteInteger}`;
  }

  valueOf(): number {
    return this.positiveFiniteInteger;
  }

  toJSON(): number {
    return this.positiveFiniteInteger;
  }

  equals(other: PositiveFiniteInteger): boolean {
    return this.positiveFiniteInteger === other.positiveFiniteInteger;
  }
}

export class BlockHeight extends PositiveFiniteInteger {
  // TODO: Improve upon this technique for sub-type discrimination
  readonly type = 'BlockHeight';
  constructor(blockHeight: number) {
    super(blockHeight);
  }

  plus(blockHeight: BlockHeight): BlockHeight {
    const result = super.plus(blockHeight);
    return new BlockHeight(result.valueOf());
  }

  minus(blockHeight: BlockHeight): BlockHeight {
    const result = super.minus(blockHeight);
    return new BlockHeight(result.valueOf());
  }
}

export class BlockTimestamp extends PositiveFiniteInteger {
  // TODO: Improve upon this technique for sub-type discrimination
  readonly type = 'BlockTimestamp';
  constructor(blockTimestamp: number) {
    super(blockTimestamp);
  }
}

// Following types were acquired from ts-essentials library
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | undefined
  | null;
// eslint-disable-next-line @typescript-eslint/ban-types
export type Builtin = Primitive | Function | Date | Error | RegExp;
export type AnyArray<Type = any> = Array<Type> | ReadonlyArray<Type>;
export type IsTuple<Type> = Type extends readonly any[]
  ? any[] extends Type
    ? never
    : Type
  : never;
export type IsAny<Type> = 0 extends 1 & Type ? true : false;
export type IsUnknown<Type> = IsAny<Type> extends true
  ? false
  : unknown extends Type
  ? true
  : false;

export type DeepReadonly<Type> = Type extends Exclude<Builtin, Error>
  ? Type
  : Type extends Map<infer Keys, infer Values>
  ? ReadonlyMap<DeepReadonly<Keys>, DeepReadonly<Values>>
  : Type extends ReadonlyMap<infer Keys, infer Values>
  ? ReadonlyMap<DeepReadonly<Keys>, DeepReadonly<Values>>
  : Type extends WeakMap<infer Keys, infer Values>
  ? WeakMap<DeepReadonly<Keys>, DeepReadonly<Values>>
  : Type extends Set<infer Values>
  ? ReadonlySet<DeepReadonly<Values>>
  : Type extends ReadonlySet<infer Values>
  ? ReadonlySet<DeepReadonly<Values>>
  : Type extends WeakSet<infer Values>
  ? WeakSet<DeepReadonly<Values>>
  : Type extends Promise<infer Value>
  ? Promise<DeepReadonly<Value>>
  : Type extends AnyArray<infer Values>
  ? Type extends IsTuple<Type>
    ? { readonly [Key in keyof Type]: DeepReadonly<Type[Key]> }
    : ReadonlyArray<DeepReadonly<Values>>
  : // eslint-disable-next-line @typescript-eslint/ban-types
  Type extends {}
  ? { readonly [Key in keyof Type]: DeepReadonly<Type[Key]> }
  : IsUnknown<Type> extends true
  ? unknown
  : Readonly<Type>;

// TODO: extend this class and use it for all balance/IO token logic
const maxAllowedPrecision = Math.pow(10, MAX_ALLOWED_DECIMALS);
export class IOToken {
  protected value: number;
  constructor(value: number) {
    // do some big number casting for allowed decimals
    this.value = +value.toFixed(MAX_ALLOWED_DECIMALS);
  }

  valueOf(): number {
    return this.value;
  }
}

export class mIOToken extends PositiveFiniteInteger {
  constructor(value: number) {
    super(value);
  }

  multiply(multiplier: mIOToken | number): mIOToken {
    // always round down on multiplication and division
    const result = Math.floor(this.valueOf() * multiplier.valueOf());
    return new mIOToken(result);
  }

  divide(divisor: mIOToken | number): mIOToken {
    if (divisor.valueOf() === 0) {
      // TODO: how should we handle this
      throw new ContractError('Cannot divide by zero');
    }
    // always round down on multiplication and division
    const result = Math.floor(this.valueOf() / divisor.valueOf());
    return new mIOToken(result);
  }

  plus(addend: mIOToken): mIOToken {
    const result = super.plus(addend);
    return new mIOToken(result.valueOf());
  }

  minus(subtractHend: mIOToken): mIOToken {
    const result = super.minus(subtractHend);
    return new mIOToken(result.valueOf());
  }

  toIO(): IOToken {
    return new IOToken(this.valueOf() / maxAllowedPrecision);
  }
}
