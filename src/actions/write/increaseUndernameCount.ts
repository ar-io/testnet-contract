import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_ALLOWED_UNDERNAMES,
  MAX_UNDERNAME_MESSAGE,
  PERMABUY_LEASE_FEE_LENGTH,
} from '../../constants';
import { calculateUndernameCost } from '../../pricing';
import {
  BlockTimestamp,
  ContractWriteResult,
  IOState,
  PstAction,
} from '../../types';
import {
  calculateYearsBetweenTimestamps,
  getInvalidAjvMessage,
  isExistingActiveRecord,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateIncreaseUndernameCount } from '../../validations';

export class IncreaseUndernameCount {
  function = 'increaseUndernameCount';
  name: string;
  qty: number;

  constructor(input: any) {
    // validate using ajv validator
    if (!validateIncreaseUndernameCount(input)) {
      throw new ContractError(
        getInvalidAjvMessage(
          validateIncreaseUndernameCount,
          input,
          'increaseUndernameCount',
        ),
      );
    }
    const { name, qty } = input;
    this.name = name.trim().toLowerCase();
    this.qty = qty;
  }
}
// Increases the lease time for an existing record
export const increaseUndernameCount = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { name, qty } = new IncreaseUndernameCount(input);
  const { balances, records } = state;
  const record = records[name];
  const currentBlockTimestamp = new BlockTimestamp(+SmartWeave.block.timestamp);

  // This name's lease has expired and cannot be extended
  if (
    !isExistingActiveRecord({
      record,
      currentBlockTimestamp,
    })
  ) {
    if (!record) {
      throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
    }
    throw new ContractError(
      `This name has expired and must renewed before its undername support can be extended.`,
    );
  }

  const { undernames: existingUndernames = 10, type, endTimestamp } = record;
  // the new total qty
  const incrementedUndernames = existingUndernames + qty;
  if (incrementedUndernames > MAX_ALLOWED_UNDERNAMES) {
    throw new ContractError(MAX_UNDERNAME_MESSAGE);
  }

  const yearsRemaining = endTimestamp
    ? calculateYearsBetweenTimestamps({
        startTimestamp: currentBlockTimestamp,
        endTimestamp: new BlockTimestamp(endTimestamp),
      })
    : PERMABUY_LEASE_FEE_LENGTH;

  const additionalUndernameCost = calculateUndernameCost({
    name,
    fees: state.fees,
    increaseQty: qty,
    type,
    demandFactoring: state.demandFactoring,
    years: yearsRemaining,
  });

  // Check if the user has enough tokens to increase the undername count
  if (!walletHasSufficientBalance(balances, caller, additionalUndernameCost)) {
    throw new ContractError(
      `${INSUFFICIENT_FUNDS_MESSAGE}: caller has ${balances[
        caller
      ].toLocaleString()} but needs to have ${additionalUndernameCost.toLocaleString()} to pay for this undername increase of ${qty} for ${name}.`,
    );
  }

  state.records[name].undernames = incrementedUndernames;
  state.balances[caller] -= additionalUndernameCost;
  state.balances[SmartWeave.contract.id] += additionalUndernameCost;

  return { state };
};
