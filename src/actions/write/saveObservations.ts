import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
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
  const { epochStartHeight, epochEndHeight } = getEpochBoundariesForHeight({
    currentBlockHeight: new BlockHeight(+SmartWeave.block.height), // observations must be submitted within the epoch and after the last epochs distribution period (see below)
    epochZeroStartHeight: new BlockHeight(distributions.epochZeroStartHeight),
    epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
  });

  // avoid observations before the previous epoch distribution has occurred, as distributions affect weights of the current epoch
  if (
    +SmartWeave.block.height <
    epochStartHeight.valueOf() + EPOCH_DISTRIBUTION_DELAY
  ) {
    throw new ContractError(
      `Observations for the current epoch cannot be submitted before block height: ${
        epochStartHeight.valueOf() + EPOCH_DISTRIBUTION_DELAY
      }`,
    );
  }

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
