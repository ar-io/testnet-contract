import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  MAX_ALLOWED_UNDERNAMES,
  MAX_UNDERNAME_MESSAGE,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateProRatedUndernameCost,
  getInvalidAjvMessage,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateIncreaseUndernameCount } from '../../validations.mjs';

declare const ContractError;
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
  const { name, qty } = new IncreaseUndernameCount(input);
  const { balances, records, owner } = state;
  const record = records[name];

  // check if record exists
  if (!record) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  const { undernames = 10, type, endTimestamp } = record;
  const currentBlockTime = +SmartWeave.block.timestamp;
  const undernameCost = calculateProRatedUndernameCost(
    qty,
    currentBlockTime,
    type,
    endTimestamp,
  );

  // the new total qty
  const incrementedUndernames = undernames + qty;
  if (incrementedUndernames > MAX_ALLOWED_UNDERNAMES) {
    throw new ContractError(MAX_UNDERNAME_MESSAGE);
  }

  // Check if the user has enough tokens to increase the undername count
  if (!walletHasSufficientBalance(balances, caller, undernameCost)) {
    throw new ContractError(
      `${INSUFFICIENT_FUNDS_MESSAGE}: caller has ${balances[
        caller
      ].toLocaleString()} but needs to have ${undernameCost.toLocaleString()} to pay for this undername increase of ${qty} for ${name}.`,
    );
  }

  // This name's lease has expired and cannot be extended
  if (endTimestamp + SECONDS_IN_GRACE_PERIOD <= currentBlockTime) {
    throw new ContractError(
      `This name has expired and must renewed before its undername support can be extended.`,
    );
  }
  // TODO: move cost to protocol balance
  state.records[name].undernames = incrementedUndernames;
  state.balances[caller] -= undernameCost;
  state.balances[owner] += undernameCost;

  return { state };
};
