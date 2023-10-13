import {
  CALLER_NOT_VALID_OBSERVER_MESSAGE,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  INVALID_OBSERVATION_TARGET,
  TARGET_GATEWAY_NOT_REGISTERED,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import {
  getEpochStart,
  getInvalidAjvMessage,
  getPrescribedObservers,
} from '../../utilities';
// composed by ajv at build
import { validateSaveObservations } from '../../validations.mjs';

declare const ContractError;
declare const SmartWeave: any;

export class SaveObservations {
  observationReportTxId: string;
  failedGateways: string[];

  constructor(input: any) {
    // validate using ajv validator
    if (!validateSaveObservations(input)) {
      throw new ContractError(
        getInvalidAjvMessage(validateSaveObservations, input),
      );
    }
    const { observationReportTxId, failedGateways } = input;
    this.observationReportTxId = observationReportTxId;
    this.failedGateways = failedGateways;
  }
}

export const saveObservations = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractResult> => {
  // get all other relevant state data
  const { observations, gateways, settings } = state;
  const { observationReportTxId, failedGateways } = new SaveObservations(input); // does validation on constructor
  const currentEpochStartHeight = getEpochStart({
    startHeight: DEFAULT_START_HEIGHT,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: +SmartWeave.block.currentBlockHeight,
  });

  const gateway = gateways[caller];
  if (!gateway) {
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  } else if (gateway.start > currentEpochStartHeight) {
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

  if (!(caller in prescribedObservers)) {
    // The gateway with the specified address is not found in the eligibleObservers list
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
      throw new ContractError(TARGET_GATEWAY_NOT_REGISTERED); // optionally, we could skip these records instead of throwing an error
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
        ] = [caller];
      } else {
        //check if this observer has already marked this gateway as failed, and if not, mark it as failed
        if (
          observations[currentEpochStartHeight].failureSummaries[
            failedGateways[i]
          ].indexOf(caller) === -1
        ) {
          observations[currentEpochStartHeight].failureSummaries[
            failedGateways[i]
          ].push(caller);
        }
      }
    } else {
      throw new ContractError(INVALID_OBSERVATION_TARGET); // optionally, we could skip these records instead of throwing an error
    }
  }

  // add this observers report tx id to this epoch
  state.observations[currentEpochStartHeight].reports[caller] =
    observationReportTxId;
  return { state };
};
