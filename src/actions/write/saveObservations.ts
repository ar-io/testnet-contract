import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  INVALID_OBSERVATION_CALLER_MESSAGE,
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
  failedGateways: TransactionId[];
  gatewayAddress: WalletAddress;

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

  const prescribedObservers = await getPrescribedObserversForEpoch({
    gateways,
    minNetworkJoinStakeAmount: settings.registry.minNetworkJoinStakeAmount,
    epochStartHeight,
    epochEndHeight,
    distributions,
  });

  // find the observer that is submitting the observation
  const observer: WeightedObserver | undefined = prescribedObservers.find(
    (prescribedObserver: WeightedObserver) =>
      prescribedObserver.observerAddress === caller,
  );

  if (!observer) {
    throw new ContractError(INVALID_OBSERVATION_CALLER_MESSAGE);
  }

  // get the gateway that of this observer
  const observingGateway = gateways[observer.gatewayAddress];

  // no gateway found
  if (!observingGateway) {
    throw new ContractError(
      'The associated gateway does not exist in the registry',
    );
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
