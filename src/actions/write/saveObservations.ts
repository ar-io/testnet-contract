import {
  CALLER_NOT_VALID_OBSERVER_MESSAGE,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
} from '../../constants';
import { ContractWriteResult, IOState, PstAction } from '../../types';
import {
  getEpochStart,
  getInvalidAjvMessage,
  getPrescribedObservers,
} from '../../utilities';
// composed by ajv at build
import { validateSaveObservations } from '../../validations';

export class SaveObservations {
  observerReportTxId: string;
  failedGateways: string[];

  constructor(input: any) {
    // validate using ajv validator
    if (!validateSaveObservations(input)) {
      throw new ContractError(
        getInvalidAjvMessage(
          validateSaveObservations,
          input,
          'saveObservations',
        ),
      );
    }
    const { observerReportTxId, failedGateways } = input;
    this.observerReportTxId = observerReportTxId;
    this.failedGateways = failedGateways;
  }
}

export const saveObservations = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  // get all other relevant state data
  const { observations, gateways, settings } = state;
  const { observerReportTxId, failedGateways } = new SaveObservations(input); // does validation on constructor
  const currentEpochStartHeight = getEpochStart({
    startHeight: DEFAULT_START_HEIGHT,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: +SmartWeave.block.height,
  });

  let gatewayAddress: string;
  if (gateways[caller]) {
    // This caller is a known gateway
    gatewayAddress = caller;
  } else {
    // This caller is not a known gateway, so check if it matches an observer wallet
    for (const address in gateways) {
      if (gateways[address].observerWallet === caller) {
        gatewayAddress = address;
      }
    }
    if (!gatewayAddress) {
      throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
    }
  }

  const gateway = gateways[gatewayAddress];
  if (gateway.start > currentEpochStartHeight) {
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.minNetworkJoinStakeAmount,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

  if (
    !prescribedObservers.some(
      (observer) =>
        observer.gatewayAddress === gatewayAddress ||
        observer.observerAddress === gateway.observerWallet,
    )
  ) {
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  // check if this is the first report filed in this epoch
  if (!observations[currentEpochStartHeight]) {
    observations[currentEpochStartHeight] = {
      failureSummaries: {},
      reports: {},
    };
  }

  // process the failed gateway summary
  for (let i = 0; i < failedGateways.length; i++) {
    // check if gateway is valid for being observed
    if (!gateways[failedGateways[i]]) {
      continue;
      // throw new ContractError(TARGET_GATEWAY_NOT_REGISTERED); // optionally, we could halt here and throw an error
    }

    if (gateways[failedGateways[i]].start <= currentEpochStartHeight) {
      // Check if any observer has failed this gateway, and if not, mark it as failed
      if (
        !observations[currentEpochStartHeight].failureSummaries[
          failedGateways[i]
        ]
      ) {
        observations[currentEpochStartHeight].failureSummaries[
          failedGateways[i]
        ] = [gatewayAddress];
      } else {
        //check if this observer has already marked this gateway as failed, and if not, mark it as failed
        if (
          observations[currentEpochStartHeight].failureSummaries[
            failedGateways[i]
          ].indexOf(gatewayAddress) === -1
        ) {
          observations[currentEpochStartHeight].failureSummaries[
            failedGateways[i]
          ].push(gatewayAddress);
        }
      }
    } else {
      continue;
      // throw new ContractError(INVALID_OBSERVATION_TARGET); // optionally, we could halt here and throw an error
    }
  }

  // add this observers report tx id to this epoch
  state.observations[currentEpochStartHeight].reports[gatewayAddress] =
    observerReportTxId;

  return { state };
};
