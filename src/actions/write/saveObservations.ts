import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  INVALID_OBSERVATION_FOR_GATEWAY_MESSAGE,
  INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
  NETWORK_JOIN_STATUS,
} from '../../constants';
import {
  getEligibleGatewaysForEpoch,
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
  failedGateways: TransactionId[];
  gatewayAddress: WalletAddress;

  constructor(input: any, caller: TransactionId) {
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
    const {
      observerReportTxId,
      failedGateways,
      gatewayAddress = caller, // default the gateway address to the caller
    } = input;
    this.observerReportTxId = observerReportTxId;
    this.failedGateways = failedGateways;
    this.gatewayAddress = gatewayAddress;
  }
}

export const saveObservations = async (
  state: IOState,
  { caller, input }: PstAction,
): Promise<ContractWriteResult> => {
  // get all other relevant state data
  const { observations, gateways, settings, distributions } = state;
  const { gatewayAddress, observerReportTxId, failedGateways } =
    new SaveObservations(input, caller);

  // TODO: check if current height is less than epochZeroStartHeight
  if (+SmartWeave.block.height < distributions.epochZeroStartHeight) {
    throw new ContractError(
      `Observations cannot be submitted before block height: ${distributions.epochZeroStartHeight}`,
    );
  }

  const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height), // observations must be submitted within the epoch
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
  });

  // get the gateway that is creating the observation
  const observingGateway = gateways[gatewayAddress];

  // no gateway found found
  if (!observingGateway) {
    throw new ContractError(INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE);
  }

  // gateway found but the caller is not the observer wallet
  if (observingGateway.observerWallet !== caller) {
    throw new ContractError(INVALID_OBSERVATION_FOR_GATEWAY_MESSAGE);
  }

  // gateway found but it is not allowed to submit observations for the epoch
  if (
    observingGateway.start > epochStartHeight.valueOf() ||
    observingGateway.status !== NETWORK_JOIN_STATUS
  ) {
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
  }

  // filter out gateways eligible for epoch distribution
  const eligibleGateways = getEligibleGatewaysForEpoch({
    epochStartHeight,
    epochEndHeight,
    gateways,
  });

  const prescribedObservers = await getPrescribedObserversForEpoch({
    eligibleGateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight,
    distributions,
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
  for (const address of failedGateways) {
    const failedGateway: Gateway = gateways[address];
    // validate the gateway is in the gar or is leaving
    if (
      !failedGateway ||
      failedGateway.start > epochStartHeight.valueOf() ||
      failedGateway.status !== NETWORK_JOIN_STATUS
    ) {
      continue;
    }

    // get the existing set of failed gateways for this observer
    const existingObservers =
      observations[epochStartHeight.valueOf()].failureSummaries[address] || [];

    // append any new observations to the existing set
    const updatedObserversForFailedGateway: Set<WalletAddress> = new Set([
      ...existingObservers,
    ]);

    // add it to the array for this observer
    updatedObserversForFailedGateway.add(observingGateway.observerWallet);

    // update the list of observers that mark the gateway as failed
    observations[epochStartHeight.valueOf()].failureSummaries[address] = [
      ...updatedObserversForFailedGateway,
    ];
  }

  // add this observers report tx id to this epoch
  observations[epochStartHeight.valueOf()].reports[
    observingGateway.observerWallet
  ] = observerReportTxId;

  // update state
  state.observations = observations;

  return { state };
};
