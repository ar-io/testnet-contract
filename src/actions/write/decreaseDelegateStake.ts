import { safeDecreaseDelegateStake } from '../../delegates';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
  mIOToken,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateDecreaseDelegateStake } from '../../validations';

export class DecreaseDelegateStake {
  target: string;
  qty: mIOToken;

  constructor(input: any) {
    if (!validateDecreaseDelegateStake(input)) {
      throw new ContractError(
        getInvalidAjvMessage(
          validateDecreaseDelegateStake,
          input,
          'decreaseDelegateStake',
        ),
      );
    }
    const { target, qty } = input;
    this.target = target;
    this.qty = new mIOToken(qty); // round to avoid bad user input errors
  }
}

export const decreaseDelegateStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { gateways } = state;
  const { target, qty } = new DecreaseDelegateStake(input);

  safeDecreaseDelegateStake({
    gateways,
    fromAddress: caller,
    gatewayAddress: target,
    qty,
    id: SmartWeave.transaction.id,
    startHeight: new BlockHeight(SmartWeave.block.height),
  });

  return { state };
};
