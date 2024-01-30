import { safeDelegateStake } from '../../delegateStake';
import {
  BlockHeight,
  ContractWriteResult,
  IOState,
  IOToken,
  PstAction,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateDelegateStake } from '../../validations';

export class DelegateStake {
  target: string;
  qty: IOToken;

  constructor(input: any) {
    if (!validateDelegateStake(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateDelegateStake, input, 'delegateStake'),
      );
    }
    const { target, qty } = input;
    this.target = target;
    this.qty = new IOToken(qty);
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
