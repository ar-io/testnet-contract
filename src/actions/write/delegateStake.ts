import { safeDelegateStake } from '../../delegates';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  PstAction,
  mIOToken,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateDelegateStake } from '../../validations';

export class DelegateStake {
  target: string;
  qty: mIOToken;

  constructor(input: any) {
    if (!validateDelegateStake(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateDelegateStake, input, 'delegateStake'),
      );
    }
    const { target, qty } = input;
    this.target = target;
    this.qty = new mIOToken(qty);
  }
}

export const delegateStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { balances, gateways } = state;
  const { target, qty } = new DelegateStake(input);

  safeDelegateStake({
    balances,
    gateways,
    fromAddress: caller,
    gatewayAddress: target,
    qty,
    startHeight: new BlockHeight(SmartWeave.block.height),
  });

  return { state };
};
