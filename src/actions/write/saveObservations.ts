import {
  CALLER_NOT_REGISTERED_GATEWAY_MESSAGE,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';
import { getEpochStart, getInvalidAjvMessage } from '../../utilities';
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

export const saveObservations = (
  state: IOState,
  { caller, input }: PstAction,
): ContractResult => {
  // get all other relevant state data
  const { observation, gateways } = state;
  const { observationReportTxId, failedGateways } = new SaveObservations(input); // does validation on constructor
  const currentEpochStartHeight = getEpochStart({
    startHeight: 0,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: +SmartWeave.block.height,
  });

  // caller must be a valid gateway
  // TO DO: caller must be a valid observer for this epoch
  const observer = gateways[caller];
  if (!observer) {
    throw new ContractError(CALLER_NOT_REGISTERED_GATEWAY_MESSAGE);
  }

  // mark each gateway as failed in the observation report
  for (let i = 0; i < failedGateways.length; i++) {
    // check if gateway is valid for this epoch
    if (
      gateways[failedGateways[i]].status === NETWORK_JOIN_STATUS &&
      gateways[failedGateways[i]].start <= currentEpochStartHeight
    ) {
      // check if this gateway has already been marked as failed
      if (observation[currentEpochStartHeight].summaries[failedGateways[i]]) {
        //check if this observer has already marked this gateway as failed, and if not, mark it as failed
        if (
          observation[currentEpochStartHeight].summaries[
            failedGateways[i]
          ].indexOf(caller) === -1
        ) {
          // has not been marked as down this observer, so it is marked as down
          observation[currentEpochStartHeight].summaries[
            failedGateways[i]
          ].push(caller);
        }
      } else {
        // has not been marked as down by any observer, so it is marked as down
        observation[currentEpochStartHeight].summaries[failedGateways[i]] = [
          caller,
        ];
      }
    }
  }

  // add this observers report tx id to this epoch
  state.observation[currentEpochStartHeight].reports[caller] =
    observationReportTxId;
  return { state };
};
