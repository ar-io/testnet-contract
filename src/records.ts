import { isNameRequiredToBeAuction } from './auctions';
import {
  ARNS_INVALID_SHORT_NAME,
  ARNS_LEASE_LENGTH_MAX_YEARS,
  ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE,
  ARNS_NAME_RESERVED_MESSAGE,
  ARNS_NON_EXPIRED_NAME_MESSAGE,
  MINIMUM_ALLOWED_NAME_LENGTH,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
  SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP,
} from './constants';
import {
  ArNSLeaseData,
  ArNSNameData,
  BlockTimestamp,
  DeepReadonly,
  Records,
  ReservedNameData,
  ReservedNames,
} from './types';

export function isNameInGracePeriod({
  record,
  currentBlockTimestamp,
}: {
  currentBlockTimestamp: BlockTimestamp;
  record: ArNSLeaseData;
}): boolean {
  if (!record.endTimestamp) return false;
  const recordIsExpired = currentBlockTimestamp.valueOf() > record.endTimestamp;
  return (
    recordIsExpired &&
    record.endTimestamp + SECONDS_IN_GRACE_PERIOD >
      currentBlockTimestamp.valueOf()
  );
}

export function getMaxAllowedYearsExtensionForRecord({
  currentBlockTimestamp,
  record,
}: {
  currentBlockTimestamp: BlockTimestamp;
  record: ArNSLeaseData;
}): number {
  if (!record.endTimestamp) {
    return 0;
  }
  // if expired return 0 because it cannot be extended and must be re-bought
  if (
    currentBlockTimestamp.valueOf() >
    record.endTimestamp + SECONDS_IN_GRACE_PERIOD
  ) {
    return 0;
  }

  if (isNameInGracePeriod({ currentBlockTimestamp, record })) {
    return ARNS_LEASE_LENGTH_MAX_YEARS;
  }

  // TODO: should we put this as the ceiling? or should we allow people to extend as soon as it is purchased
  const yearsRemainingOnLease = Math.ceil(
    (record.endTimestamp.valueOf() - currentBlockTimestamp.valueOf()) /
      SECONDS_IN_A_YEAR,
  );

  // a number between 0 and 5 (MAX_YEARS)
  return ARNS_LEASE_LENGTH_MAX_YEARS - yearsRemainingOnLease;
}

export function isExistingActiveRecord({
  record,
  currentBlockTimestamp,
}: {
  record: ArNSNameData | undefined;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  if (!record) return false;

  if (!isLeaseRecord(record)) {
    return true;
  }

  return (
    record.endTimestamp > currentBlockTimestamp.valueOf() ||
    isNameInGracePeriod({ currentBlockTimestamp, record })
  );
}

export function isShortNameRestricted({
  name,
  currentBlockTimestamp,
}: {
  name: string;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  return (
    name.length < MINIMUM_ALLOWED_NAME_LENGTH &&
    currentBlockTimestamp.valueOf() < SHORT_NAME_RESERVATION_UNLOCK_TIMESTAMP
  );
}

export function isActiveReservedName({
  caller,
  reservedName,
  currentBlockTimestamp,
}: {
  caller: string | undefined;
  reservedName: ReservedNameData | undefined;
  currentBlockTimestamp: BlockTimestamp;
}): boolean {
  if (!reservedName) return false;
  const target = reservedName.target;
  const endTimestamp = reservedName.endTimestamp;
  const permanentlyReserved = !target && !endTimestamp;
  if (permanentlyReserved) {
    return true;
  }

  const isCallerTarget = caller !== undefined && target === caller;
  const isActiveReservation =
    endTimestamp && endTimestamp > currentBlockTimestamp.valueOf();

  // if the caller is not the target, and it's still active - the name is considered reserved
  if (!isCallerTarget && isActiveReservation) {
    return true;
  }
  return false;
}

export function assertAvailableRecord({
  caller,
  name,
  records,
  reserved,
  currentBlockTimestamp,
  type,
  auction,
}: {
  caller: string | undefined; // TODO: type for this
  name: DeepReadonly<string>;
  records: DeepReadonly<Records>;
  reserved: DeepReadonly<ReservedNames>;
  currentBlockTimestamp: BlockTimestamp;
  type: 'permabuy' | 'lease';
  auction: boolean;
}): void {
  const isActiveRecord = isExistingActiveRecord({
    record: records[name],
    currentBlockTimestamp,
  });
  const isReserved = isActiveReservedName({
    caller,
    reservedName: reserved[name],
    currentBlockTimestamp,
  });
  const isShortName = isShortNameRestricted({
    name,
    currentBlockTimestamp,
  });
  const isAuctionRequired = isNameRequiredToBeAuction({ name, type });
  if (isActiveRecord) {
    throw new ContractError(ARNS_NON_EXPIRED_NAME_MESSAGE);
  }

  if (reserved[name]?.target === caller) {
    // if the caller is the target of the reserved name, they can buy it
    return;
  }

  if (isReserved) {
    throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
  }

  if (isShortName) {
    throw new ContractError(ARNS_INVALID_SHORT_NAME);
  }

  // TODO: we may want to move this up if we want to force permabuys for short names on reserved names
  if (isAuctionRequired && !auction) {
    throw new ContractError(ARNS_NAME_MUST_BE_AUCTIONED_MESSAGE);
  }
}

export function isLeaseRecord(record: ArNSNameData): record is ArNSLeaseData {
  return record.type === 'lease';
}
