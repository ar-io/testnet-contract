import {
  GATEWAY_REGISTRY_SETTINGS,
  INVALID_GATEWAY_EXISTS_MESSAGE,
  MIN_OPERATOR_STAKE,
  NETWORK_LEAVING_STATUS,
} from '../../constants';
import {
  BlockHeight,
  ContractWriteResult,
  Gateway,
  IOState,
  PstAction,
  mIOToken,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
import { validateDecreaseOperatorStake } from '../../validations';

export class DecreaseOperatorStake {
  qty: mIOToken;

  constructor(input: any) {
    if (!validateDecreaseOperatorStake(input)) {
      throw new ContractError(
        getInvalidAjvMessage(
          validateDecreaseOperatorStake,
          input,
          'decreaseOperatorStake',
        ),
      );
    }
    const { qty } = input;
    this.qty = new mIOToken(qty); // round to avoid bad user input errors
  }
}

// Begins the process to unlocks the vault of a gateway operator
export const decreaseOperatorStake = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  const { gateways } = state;
  const { qty } = new DecreaseOperatorStake(input);

  if (!(caller in gateways)) {
    throw new ContractError(INVALID_GATEWAY_EXISTS_MESSAGE);
  }

  if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
    throw new ContractError(
      'Gateway is leaving the network and cannot accept additional stake.',
    );
  }

  const existingStake = new mIOToken(gateways[caller].operatorStake);
  const maxWithdraw = existingStake.minus(MIN_OPERATOR_STAKE);

  if (qty.isGreaterThan(maxWithdraw)) {
    throw new ContractError(
      `Resulting stake is not enough maintain the minimum operator stake of ${MIN_OPERATOR_STAKE.valueOf()}`,
    );
  }

  const interactionHeight = new BlockHeight(+SmartWeave.block.height);

  const updatedGateway: Gateway = {
    ...gateways[caller],
    operatorStake: existingStake.minus(qty).valueOf(),
    vaults: {
      ...gateways[caller].vaults,
      [SmartWeave.transaction.id]: {
        balance: qty.valueOf(),
        start: interactionHeight.valueOf(),
        end: interactionHeight
          .plus(GATEWAY_REGISTRY_SETTINGS.operatorStakeWithdrawLength)
          .valueOf(),
      },
    },
  };
  // Remove the tokens from the operator stake
  state.gateways[caller] = updatedGateway;
  return { state };
};
