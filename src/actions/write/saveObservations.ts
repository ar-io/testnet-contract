import {
  CALLER_NOT_VALID_OBSERVER_MESSAGE,
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import {
  ContractWriteResult,
  Gateway,
  IOState,
  PstAction,
  WalletAddress,
  WeightedObserver,
} from '../../types';
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

  // get the gateway that is creating the observation
  const observingGatewayArray = Object.entries(gateways).find(
    ([gatewayAddress, gateway]: [WalletAddress, Gateway]) =>
      gatewayAddress === caller || gateway.observerWallet === caller,
  );

  // no observer found
  if (!observingGatewayArray) {
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  // get the gateway address and observer address of the gateway that is creating the observation
  const [observingGatewayAddress, observingGateway]: [WalletAddress, Gateway] =
    observingGatewayArray;

  if (observingGateway.start > currentEpochStartHeight) {
    throw new ContractError(CALLER_NOT_VALID_OBSERVER_MESSAGE);
  }

  const prescribedObservers = await getPrescribedObservers(
    gateways,
    settings.registry.minNetworkJoinStakeAmount,
    settings.registry.gatewayLeaveLength,
    currentEpochStartHeight,
  );

  if (
    !prescribedObservers.find(
      (prescribedObserver: WeightedObserver) =>
        prescribedObserver.gatewayAddress === observingGatewayAddress ||
        prescribedObserver.gatewayAddress === observingGateway.observerWallet,
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
  for (const observedFailedGatewayAddress of failedGateways) {
    // validate the gateway is in the gar or is leaving
    const failedGateway = gateways[observedFailedGatewayAddress];
    if (
      !failedGateway ||
      failedGateway.start > currentEpochStartHeight ||
      failedGateway.status !== NETWORK_JOIN_STATUS
    ) {
      continue;
    }

    // Check if any observer has failed this gateway, and if not, mark it as failed
    const existingObservationInEpochForGateway: WalletAddress[] =
      observations[currentEpochStartHeight].failureSummaries[
        observedFailedGatewayAddress
      ];

    // editing observation for gateway, add current observing gateway to list of observers
    if (existingObservationInEpochForGateway) {
      // the observer has already reported it for the current epoch
      if (
        existingObservationInEpochForGateway.includes(observingGatewayAddress)
      ) {
        continue;
      }
      // add it to the list of observers
      existingObservationInEpochForGateway.push(observingGatewayAddress);
      continue;
    }

    // create the new failure summary for the observed gateway
    observations[currentEpochStartHeight].failureSummaries[
      observedFailedGatewayAddress
    ] = [observingGatewayAddress];
  }

  // add this observers report tx id to this epoch
  state.observations[currentEpochStartHeight].reports[observingGatewayAddress] =
    observerReportTxId;

  return { state };
};
