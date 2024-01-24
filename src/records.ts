import {
  ARNS_INVALID_SHORT_NAME,
  ARNS_LEASE_LENGTH_MAX_YEARS,
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
  currentBlockTimestamp,
  record,
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

  if (record.type === 'permabuy') {
    return true;
  }

  if (record.type === 'lease' && record.endTimestamp) {
    return (
      record.endTimestamp > currentBlockTimestamp.valueOf() ||
      isNameInGracePeriod({ currentBlockTimestamp, record })
    );
  }
  return false;
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
  const callerNotTarget = !caller || target !== caller;
  const notExpired =
    endTimestamp && endTimestamp > currentBlockTimestamp.valueOf();
  if (callerNotTarget && notExpired) {
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
}: {
  caller: string | undefined; // TODO: type for this
  name: DeepReadonly<string>;
  records: DeepReadonly<Records>;
  reserved: DeepReadonly<ReservedNames>;
  currentBlockTimestamp: BlockTimestamp;
}): void {
  if (
    isExistingActiveRecord({
      record: records[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(ARNS_NON_EXPIRED_NAME_MESSAGE);
  }
  if (
    isActiveReservedName({
      caller,
      reservedName: reserved[name],
      currentBlockTimestamp,
    })
  ) {
    throw new ContractError(ARNS_NAME_RESERVED_MESSAGE);
  }

  if (isShortNameRestricted({ name, currentBlockTimestamp })) {
    throw new ContractError(ARNS_INVALID_SHORT_NAME);
  }
}

export function isLeaseRecord(record: ArNSNameData): record is ArNSLeaseData {
  return record.type === 'lease';
}
