import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import {
  getEpochBoundariesForHeight,
  getPrescribedObserversForEpoch,
} from '../../observers';
import {
  BlockHeight,
  ContractWriteResult,
  Gateway,
  IOState,
  PstAction,
  TransactionId,
  WalletAddress,
  WeightedObserver,
} from '../../types';
import { getInvalidAjvMessage } from '../../utilities';
// composed by ajv at build
import { validateSaveObservations } from '../../validations';

export class SaveObservations {
  observerReportTxId: TransactionId;
  failedGateways: WalletAddress[];

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
  const { observations, gateways, settings, distributions } = state;
  const { observerReportTxId, failedGateways } = new SaveObservations(input);
  const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height), // a block height in the middle of the first epoch
    epochZeroBlockHeight: new BlockHeight(distributions.epochZeroBlockHeight),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  // get the gateway that is creating the observation
  const observingGateway = Object.values(gateways).find(
    (gateway: Gateway) => gateway.observerWallet === caller,
  );

  // no observer found
  if (!observingGateway) {
    throw new ContractError(INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE);
  }

  if (
    observingGateway.start > epochStartHeight.valueOf() ||
    observingGateway.status !== NETWORK_JOIN_STATUS
  ) {
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
  }

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight,
    epochEndHeight,
  });

  if (
    !prescribedObservers.some(
      (prescribedObserver: WeightedObserver) =>
        prescribedObserver.observerAddress === observingGateway.observerWallet,
    )
  ) {
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
  }

  // check if this is the first report filed in this epoch (TODO: use start or end?)
  if (!observations[epochStartHeight.valueOf()]) {
    observations[epochStartHeight.valueOf()] = {
      failureSummaries: {},
      reports: {},
    };
  }

  // process the failed gateway summary
  for (const failedGatewayAddress of failedGateways) {
    // validate the gateway is in the gar or is leaving
    const failedGateway = gateways[failedGatewayAddress];
    if (
      !failedGateway ||
      failedGateway.start > epochStartHeight.valueOf() ||
      failedGateway.status !== NETWORK_JOIN_STATUS
    ) {
      continue;
    }

    // get the existing set of failed gateways for this observer
    const existingObservers =
      observations[epochStartHeight.valueOf()].failureSummaries[
        failedGatewayAddress
      ] || [];

    // append any new observations to the existing set
    const updatedObserversForFailedGateway: Set<WalletAddress> = new Set([
      ...existingObservers,
    ]);

    // add it to the array for this observer
    updatedObserversForFailedGateway.add(observingGateway.observerWallet);

    // update the list of observers that mark the gateway as failed
    observations[epochStartHeight.valueOf()].failureSummaries[
      failedGatewayAddress
    ] = [...updatedObserversForFailedGateway];
  }

  // add this observers report tx id to this epoch
  observations[epochStartHeight.valueOf()].reports[
    observingGateway.observerWallet
  ] = observerReportTxId;

  // update state
  state.observations = observations;

  return { state };
};
