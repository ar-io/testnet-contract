import { DEFAULT_EPOCH_BLOCK_LENGTH } from 'src/constants';

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
  const { balances, records, reserved, fees, auctions, owner } = state;
  const { observationReportTxId, failedGateways } = new SaveObservations(input); // does validation on constructor
  const currentEpochStartHeight = getEpochStart({
    startHeight: 0,
    epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
    height: +SmartWeave.block.height,
  });

  // caller must be a selected observer
  // gateway must be valid for the epoch

  // update the failed gateways
  state.observationReports[currentEpochStartHeight][caller] = {
    observationReportTxId,
    failedGateways,
  };
  return { state };
};
