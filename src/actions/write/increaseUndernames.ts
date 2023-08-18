import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_INPUT_MESSAGE,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  calculateProRatedUndernameCost,
  walletHasSufficientBalance,
} from '../../utilities';
import { validateIncreaseUndernames } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export class IncreaseUndernames {
  function = 'increaseUndernames';
  name: string;
  qty: number;

  constructor(input: any) {
    // validate using ajv validator
    if (!validateIncreaseUndernames(input)) {
      throw new ContractError(
        `${INVALID_INPUT_MESSAGE} for ${this.function}: ${(
          validateIncreaseUndernames as any
        ).errors
          .map((e) => {
            const key = e.instancePath.replace('/', '');
            const value = input[key];
            return `${key} ('${value}') ${e.message}`;
          })
          .join(', ')}`,
      );
    }
    const { name, qty } = input;
    this.name = name.trim().toLowerCase();
    this.qty = qty;
  }
}
// Increases the lease time for an existing record
export const increaseUndernames = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  const { name, qty } = new IncreaseUndernames(input);

  const { balances } = state;

  const record = state.records[name];
  const currentBlockTime = +SmartWeave.block.timestamp;
  const undernameCost = calculateProRatedUndernameCost(
    qty,
    currentBlockTime,
    record.type,
    record?.endTimestamp,
  );

  // Check if the user has enough tokens to increase the undername count
  if (!walletHasSufficientBalance(balances, caller, undernameCost)) {
    throw new ContractError(
      `${INSUFFICIENT_FUNDS_MESSAGE}: caller has ${balances[
        caller
      ].toLocaleString()} but needs to have ${undernameCost.toLocaleString()} to pay for this undername increase of ${qty} for ${name}.`,
    );
  }

  // check if record exists
  if (!record) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }
  // This name's lease has expired and cannot be extended
  if (record.endTimestamp + SECONDS_IN_GRACE_PERIOD <= currentBlockTime) {
    throw new ContractError(
      `This name has expired and must renewed before its undername support can be extended.`,
    );
  }

  if (state.balances[caller] < undernameCost) {
    throw new ContractError(
      `Caller balance is insufficient to increase undername count by ${qty} for ${name}.`,
    );
  }
  state.records[name].undernames += qty;
  state.balances[caller] -= undernameCost;

  return { state };
};
