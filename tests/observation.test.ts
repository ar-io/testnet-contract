import { Contract, JWKInterface } from 'warp-contracts';

import { BlockHeight, Gateways, IOState, WeightedObserver } from '../src/types';
import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  EXAMPLE_OBSERVER_REPORT_TX_IDS,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  OBSERVATION_FAILURE_THRESHOLD,
  WALLETS_TO_CREATE,
} from './utils/constants';
import {
  createLocalWallet,
  getCurrentBlock,
  getLocalArNSContractKey,
  getLocalWallet,
  mineBlocks,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Observation', () => {
  const gatewayWalletAddresses: string[] = [];
  let contract: Contract<IOState>;
  let srcContractId: string;
  const wallets: {
    addr: string;
    jwk: JWKInterface;
  }[] = [];

  let prescribedObserverWallets: {
    addr: string;
    jwk: JWKInterface;
  }[] = [];
  let currentEpochStartHeight: BlockHeight;
  let prescribedObservers: WeightedObserver[] = [];
  let failedGateways: string[];

  beforeAll(async () => {
    for (let i = 0; i < WALLETS_TO_CREATE; i++) {
      const gatewayWallet = getLocalWallet(i);
      const gatewayWalletAddress = await arweave.wallets.getAddress(
        gatewayWallet,
      );
      wallets.push({
        addr: gatewayWalletAddress,
        jwk: gatewayWallet,
      });
      gatewayWalletAddresses.push(gatewayWalletAddress);
    }
    srcContractId = getLocalArNSContractKey('id');
    contract = warp.contract<IOState>(srcContractId);
    failedGateways = [
      wallets[0].addr,
      wallets[1].addr,
      wallets[8].addr, // should not be include as its start block is after current
      wallets[9].addr, // should not be included as its leaving
    ];
  });

  describe('valid observer', () => {
    beforeEach(async () => {
      const { result }: { result: WeightedObserver[] } =
        await contract.viewState({
          function: 'prescribedObservers',
        });
      prescribedObservers = result;
      prescribedObserverWallets = wallets.filter((wallet) =>
        prescribedObservers.find(
          (observer: { gatewayAddress: string }) =>
            observer.gatewayAddress === wallet.addr,
        ),
      );
      currentEpochStartHeight = await contract
        .viewState({
          function: 'epoch',
        })
        .then(
          (response) =>
            new BlockHeight(
              (
                response.result as { epochStartHeight: number }
              ).epochStartHeight,
            ),
        );
    });

    describe('read operations', () => {
      it('should return the same prescribed observers for the current epoch', async () => {
        const {
          result: refreshPrescribedObservers,
        }: { result: WeightedObserver[] } = await contract.viewState({
          function: 'prescribedObservers',
        });
        expect(refreshPrescribedObservers).toEqual(prescribedObservers);
      });
    });

    describe('write interactions', () => {
      it('should save observations in epoch if prescribed observer and the current block height is past the epoch start height + delay period', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const previousState = prevCachedValue.state as IOState;
        const minimumObservationHeight =
          previousState.distributions.epochStartHeight +
          EPOCH_DISTRIBUTION_DELAY;
        const diffInBlocks =
          minimumObservationHeight - (await getCurrentBlock(arweave)).valueOf();
        if (diffInBlocks > 0) {
          await mineBlocks(arweave, diffInBlocks);
        }
        const writeInteractions = await Promise.all(
          prescribedObserverWallets.map((wallet) => {
            contract = warp
              .contract<IOState>(srcContractId)
              .connect(wallet.jwk);
            return contract.writeInteraction({
              function: 'saveObservations',
              observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
              failedGateways: [failedGateways[0]],
            });
          }),
        );
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(
          writeInteractions.every((interaction) => interaction?.originalTxId),
        ).toEqual(true);
        expect(
          writeInteractions.every((interaction) => {
            return !newCachedValue.errorMessages[interaction?.originalTxId];
          }),
        ).toEqual(true);
        expect(
          newState.observations[currentEpochStartHeight.valueOf()],
        ).toEqual({
          failureSummaries: {
            [failedGateways[0]]: expect.arrayContaining(
              prescribedObservers.map((w) => w.observerAddress),
            ),
          },
          reports: prescribedObservers.reduce(
            (report, observer) => ({
              ...report,
              [observer.observerAddress]: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
            }),
            {},
          ),
        });
      });

      it('should allow an observer to update their observation with new failures/report if selected as observer and the current block height is past the epoch start height + delay period', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const previousState = prevCachedValue.state as IOState;
        const previousSummary =
          previousState.observations[currentEpochStartHeight.valueOf()]
            ?.failureSummaries;
        const previousReports =
          previousState.observations[currentEpochStartHeight.valueOf()]
            ?.reports;
        contract = warp
          .contract<IOState>(srcContractId)
          .connect(prescribedObserverWallets[0].jwk);
        // ensure that we are past the delay period
        const minimumObservationHeight =
          previousState.distributions.epochStartHeight +
          EPOCH_DISTRIBUTION_DELAY;
        const diffInBlocks =
          minimumObservationHeight - (await getCurrentBlock(arweave)).valueOf();
        if (diffInBlocks > 0) {
          await mineBlocks(arweave, diffInBlocks);
        }
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[1],
          failedGateways: failedGateways,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(
          newCachedValue.errorMessages[writeInteraction?.originalTxId],
        ).toBeUndefined();
        expect(
          newState.observations[currentEpochStartHeight.valueOf()],
        ).toEqual({
          failureSummaries: {
            ...previousSummary,
            [failedGateways[1]]: [prescribedObserverWallets[0].addr],
          },
          reports: expect.objectContaining({
            ...previousReports,
            [prescribedObserverWallets[0].addr]:
              EXAMPLE_OBSERVER_REPORT_TX_IDS[1],
          }),
        });
      });
    });

    it('should save observations if prescribed observer with all using multiple failed gateways', async () => {
      const writeInteractions = await Promise.all(
        prescribedObserverWallets.map((wallet) => {
          contract = warp.contract<IOState>(srcContractId).connect(wallet.jwk);
          return contract.writeInteraction({
            function: 'saveObservations',
            observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
            failedGateways: failedGateways,
          });
        }),
      );
      const { cachedValue: newCachedValue } = await contract.readState();
      const updatedState = newCachedValue.state as IOState;
      expect(
        writeInteractions.every((interaction) => interaction?.originalTxId),
      ).toEqual(true);

      expect(
        writeInteractions.every((interaction) => {
          return !Object.keys(newCachedValue.errorMessages).includes(
            interaction?.originalTxId,
          );
        }),
      ).toEqual(true);
      expect(
        updatedState.observations[currentEpochStartHeight.valueOf()],
      ).toEqual({
        failureSummaries: {
          [failedGateways[0]]: expect.arrayContaining(
            prescribedObservers.map((w) => w.observerAddress),
          ),
          [failedGateways[1]]: expect.arrayContaining(
            prescribedObservers.map((w) => w.observerAddress),
          ),
        },
        reports: prescribedObserverWallets.reduce(
          (report, wallet) => ({
            ...report,
            [wallet.addr]: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
          }),
          {},
        ),
      });
    });

    it('should update gateways observerReportTxId tx id if gateway is a prescribed observer saves observation again within the same epoch', async () => {
      const previousObservation = await contract.readState();
      const prevState = previousObservation.cachedValue.state as IOState;
      const previousReportsAndSummary =
        prevState.observations[currentEpochStartHeight.valueOf()];
      const writeInteractions = await Promise.all(
        prescribedObserverWallets.map((wallet) => {
          contract = warp.contract<IOState>(srcContractId).connect(wallet.jwk);
          return contract.writeInteraction({
            function: 'saveObservations',
            observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[1],
            failedGateways: [],
          });
        }),
      );
      const { cachedValue: newCachedValue } = await contract.readState();
      const newState = newCachedValue.state as IOState;
      expect(
        writeInteractions.every((interaction) => interaction?.originalTxId),
      ).toEqual(true);

      expect(
        writeInteractions.every((interaction) => {
          return !Object.keys(newCachedValue.errorMessages).includes(
            interaction?.originalTxId,
          );
        }),
      ).toEqual(true);
      expect(newState.observations[currentEpochStartHeight.valueOf()]).toEqual({
        failureSummaries: previousReportsAndSummary.failureSummaries,
        reports: prescribedObserverWallets.reduce(
          (report, wallet) => ({
            ...report,
            [wallet.addr]: EXAMPLE_OBSERVER_REPORT_TX_IDS[1],
          }),
          {},
        ),
      });
    });
  });

  describe('non-prescribed observer', () => {
    describe('write interactions', () => {
      it('should not save observation report if not prescribed observer', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const nonPrescribedObserver = wallets[8].jwk; // not allowed to observe
        contract = warp
          .contract<IOState>(srcContractId)
          .connect(nonPrescribedObserver);
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
          failedGateways: failedGateways,
        });
        expect(writeInteraction?.originalTxId).toBeDefined();
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(
          newCachedValue.errorMessages[writeInteraction?.originalTxId],
        ).toEqual(INVALID_OBSERVATION_CALLER_MESSAGE);
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it('should not save observation report if the caller is not a registered observer', async () => {
        const notJoinedGateway = await createLocalWallet(arweave);
        const { cachedValue: prevCachedValue } = await contract.readState();
        contract = warp
          .contract<IOState>(srcContractId)
          .connect(notJoinedGateway.wallet);
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
          failedGateways: failedGateways,
        });
        expect(writeInteraction?.originalTxId).toBeDefined();
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(
          newCachedValue.errorMessages[writeInteraction?.originalTxId],
        ).toEqual(INVALID_OBSERVATION_CALLER_MESSAGE);
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });
  });
  describe('fast forwarding to the next epoch', () => {
    it('should update the prescribed observers, distributed balances, and increment gateway stats when distribution happens', async () => {
      await mineBlocks(arweave, EPOCH_BLOCK_LENGTH);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const writeInteraction = await contract
        .connect(wallets[0].jwk)
        .writeInteraction({
          function: 'tick',
        });
      // it should have have failed
      const { cachedValue: newCachedValue } = await contract.readState();
      expect(
        newCachedValue.errorMessages[writeInteraction?.originalTxId],
      ).toBeUndefined();
      const newState = newCachedValue.state as IOState;
      // updated correctly
      expect(newState.distributions).toEqual({
        epochZeroStartHeight:
          prevCachedValue.state.distributions.epochZeroStartHeight,
        epochPeriod: prevCachedValue.state.distributions.epochPeriod + 1,
        epochStartHeight:
          prevCachedValue.state.distributions.epochEndHeight + 1,
        epochEndHeight:
          prevCachedValue.state.distributions.epochEndHeight +
          EPOCH_BLOCK_LENGTH,
        nextDistributionHeight:
          prevCachedValue.state.distributions.epochEndHeight +
          EPOCH_BLOCK_LENGTH +
          EPOCH_DISTRIBUTION_DELAY,
      });
      const gatewaysAroundDuringEpoch = Object.keys(
        prevCachedValue.state.gateways,
      ).filter(
        (gatewayAddress) =>
          prevCachedValue.state.gateways[gatewayAddress].start <=
            prevCachedValue.state.distributions.epochStartHeight &&
          (prevCachedValue.state.gateways[gatewayAddress].end === 0 ||
            prevCachedValue.state.gateways[gatewayAddress].end >
              prevCachedValue.state.distributions.epochEndHeight),
      );
      const gatewaysExistedButNotStarted = Object.keys(
        prevCachedValue.state.gateways,
      ).reduce((gateways: Gateways, gatewayAddress) => {
        if (
          prevCachedValue.state.gateways[gatewayAddress].start >
          prevCachedValue.state.distributions.epochStartHeight
        ) {
          return {
            ...gateways,
            [gatewayAddress]: prevCachedValue.state.gateways[gatewayAddress],
          };
        }
        return gateways;
      }, {});
      expect(newState.gateways).toEqual({
        ...gatewaysExistedButNotStarted,
        ...gatewaysAroundDuringEpoch.reduce(
          (gateways: Gateways, gatewayAddress) => {
            const gateway = prevCachedValue.state.gateways[gatewayAddress];
            const didFail =
              prevCachedValue.state.observations[
                prevCachedValue.state.distributions.epochStartHeight
              ]?.failureSummaries[gatewayAddress] ||
              [].length >
                prescribedObservers.length * OBSERVATION_FAILURE_THRESHOLD;
            const wasPrescribed = prescribedObservers.some(
              (observer) => observer.observerAddress === gateway.observerWallet,
            );
            const didObserve =
              prevCachedValue.state.observations[
                prevCachedValue.state.distributions.epochStartHeight
              ].reports[gateway.observerWallet] !== undefined;
            return {
              ...gateways,
              [gatewayAddress]: {
                ...gateway,
                stats: {
                  failedConsecutiveEpochs: didFail
                    ? gateway.stats.failedConsecutiveEpochs + 1
                    : gateway.stats.failedConsecutiveEpochs,
                  submittedEpochCount: didObserve
                    ? gateway.stats.submittedEpochCount + 1
                    : gateway.stats.submittedEpochCount,
                  totalEpochsPrescribedCount: wasPrescribed
                    ? gateway.stats.totalEpochsPrescribedCount + 1
                    : gateway.stats.totalEpochsPrescribedCount,
                  passedEpochCount: didFail
                    ? gateway.stats.passedEpochCount
                    : gateway.stats.passedEpochCount + 1,
                  totalEpochParticipationCount:
                    gateway.stats.totalEpochParticipationCount + 1,
                },
              },
            };
          },
          {},
        ),
      });
    });
  });
});
