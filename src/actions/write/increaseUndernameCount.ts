import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_ALLOWED_UNDERNAMES,
  MAX_UNDERNAME_MESSAGE,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateProRatedUndernameCost,
  getInvalidAjvMessage,
  isExistingActiveRecord,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateIncreaseUndernameCount } from '../../validations.mjs';

declare const ContractError: any;
declare const SmartWeave: any;

export class IncreaseUndernameCount {
  function = 'increaseUndernameCount';
  name: string;
  qty: number;

  constructor(input: any) {
    // validate using ajv validator
    if (!validateIncreaseUndernameCount(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateIncreaseUndernameCount, input),
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
): Promise<ContractResult> => {
  const { name, qty: increaseUndernameCount } = new IncreaseUndernameCount(
    input,
  );
  const { balances, records } = state;
  const record = records[name];
  const currentBlockTimestamp = +SmartWeave.block.timestamp;

  // check if record exists
  if (!isExistingActiveRecord({ record, currentBlockTimestamp })) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  const { undernames = 10, type, endTimestamp } = record;
  const undernameCost = calculateProRatedUndernameCost({
    increaseUndernameCount,
    currentTimestamp: currentBlockTimestamp,
    type,
    endTimestamp,
  });

  // the new total qty
  const incrementedUndernames = undernames + increaseUndernameCount;
  if (incrementedUndernames > MAX_ALLOWED_UNDERNAMES) {
    throw new ContractError(MAX_UNDERNAME_MESSAGE);
  }

  // Check if the user has enough tokens to increase the undername count
  if (!walletHasSufficientBalance(balances, caller, undernameCost)) {
    throw new ContractError(
      `${INSUFFICIENT_FUNDS_MESSAGE}: caller has ${balances[
        caller
      ].toLocaleString()} but needs to have ${undernameCost.toLocaleString()} to pay for this undername increase of ${increaseUndernameCount} for ${name}.`,
    );
  }

  // TODO: move cost to protocol balance
  state.records[name].undernames = incrementedUndernames;
  state.balances[caller] -= undernameCost;
  state.balances[SmartWeave.contract.id] += undernameCost;

  return { state };
};
