import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import { getEpochStart, getPrescribedObservers } from '../../observers';
import {
  BlockHeight,
  ContractWriteResult,
  Gateway,
  IOState,
  PstAction,
  WalletAddress,
  WeightedObserver,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
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
    startHeight: new BlockHeight(DEFAULT_START_HEIGHT),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
    height: new BlockHeight(+SmartWeave.block.height),
  });

  // get the gateway that is creating the observation
  const observingGatewayArray = Object.entries(gateways).find(
    ([gatewayAddress, gateway]: [WalletAddress, Gateway]) =>
      gatewayAddress === caller || gateway.observerWallet === caller,
  );

  // no observer found
  if (!observingGatewayArray) {
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
  }

  // get the gateway address and observer address of the gateway that is creating the observation
  const [observingGatewayAddress, observingGateway]: [WalletAddress, Gateway] =
    observingGatewayArray;

  if (observingGateway.start > currentEpochStartHeight.valueOf()) {
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
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
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
  }

  // check if this is the first report filed in this epoch
  if (!observations[currentEpochStartHeight.valueOf()]) {
    observations[currentEpochStartHeight.valueOf()] = {
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
      failedGateway.start > currentEpochStartHeight.valueOf() ||
      failedGateway.status !== NETWORK_JOIN_STATUS
    ) {
      continue;
    }

    // Check if any observer has failed this gateway, and if not, mark it as failed
    const existingObservationInEpochForGateway: WalletAddress[] =
      observations[currentEpochStartHeight.valueOf()].failureSummaries[
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
    observations[currentEpochStartHeight.valueOf()].failureSummaries[
      observedFailedGatewayAddress
    ] = [observingGatewayAddress];
  }

  // add this observers report tx id to this epoch
  state.observations[currentEpochStartHeight.valueOf()].reports[
    observingGatewayAddress
  ] = observerReportTxId;

  return { state };
};
