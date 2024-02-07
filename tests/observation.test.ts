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
  let prevState: IOState;
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
  beforeEach(async () => {
    prevState = (await contract.readState()).cachedValue.state;
    const { result }: { result: WeightedObserver[] } = await contract.viewState(
      {
        function: 'prescribedObservers',
      },
    );
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
            (response.result as { epochStartHeight: number }).epochStartHeight,
          ),
      );
  });

  describe('valid observer', () => {
    describe('read interactions', () => {
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
      beforeAll(async () => {
        // ensure that we are past the delay period
        const minimumObservationHeight =
          prevState.distributions.epochEndHeight + EPOCH_DISTRIBUTION_DELAY + 1;
        const diffInBlocks =
          minimumObservationHeight - (await getCurrentBlock(arweave)).valueOf();
        if (diffInBlocks > 0) {
          await mineBlocks(arweave, diffInBlocks);
        }
      });
      it('should save observations in epoch if prescribed observer and the current block height is past the epoch start height + delay period', async () => {
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
        const previousSummary =
          prevState.observations[currentEpochStartHeight.valueOf()]
            ?.failureSummaries;
        const previousReports =
          prevState.observations[currentEpochStartHeight.valueOf()]?.reports;
        contract = warp
          .contract<IOState>(srcContractId)
          .connect(prescribedObserverWallets[0].jwk);
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
        expect(newCachedValue.state).toEqual(prevState);
      });

      it('should not save observation report if the caller is not a registered observer', async () => {
        const notJoinedGateway = await createLocalWallet(arweave);
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
        expect(newCachedValue.state).toEqual(prevState);
      });
    });
  });
  describe('fast forwarding to the next epoch', () => {
    it('should update the prescribed observers, distributed balances, and increment gateway stats when distribution happens', async () => {
      await mineBlocks(arweave, EPOCH_BLOCK_LENGTH);
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
        epochZeroStartHeight: prevState.distributions.epochZeroStartHeight,
        epochPeriod: prevState.distributions.epochPeriod + 1,
        epochStartHeight: prevState.distributions.epochEndHeight + 1,
        epochEndHeight:
          prevState.distributions.epochEndHeight + EPOCH_BLOCK_LENGTH,
        nextDistributionHeight:
          prevState.distributions.epochEndHeight +
          EPOCH_BLOCK_LENGTH +
          EPOCH_DISTRIBUTION_DELAY,
      });
      const gatewaysAroundDuringEpoch = Object.keys(prevState.gateways).filter(
        (gatewayAddress) =>
          prevState.gateways[gatewayAddress].start <=
            prevState.distributions.epochStartHeight &&
          (prevState.gateways[gatewayAddress].end === 0 ||
            prevState.gateways[gatewayAddress].end >
              prevState.distributions.epochEndHeight),
      );
      const gatewaysExistedButNotStarted = Object.keys(
        prevState.gateways,
      ).reduce((gateways: Gateways, gatewayAddress) => {
        if (
          prevState.gateways[gatewayAddress].start >
          prevState.distributions.epochStartHeight
        ) {
          return {
            ...gateways,
            [gatewayAddress]: prevState.gateways[gatewayAddress],
          };
        }
        return gateways;
      }, {});
      expect(newState.gateways).toEqual({
        ...gatewaysExistedButNotStarted,
        ...gatewaysAroundDuringEpoch.reduce(
          (gateways: Gateways, gatewayAddress) => {
            const gateway = prevState.gateways[gatewayAddress];
            const didFail =
              prevState.observations[prevState.distributions.epochStartHeight]
                ?.failureSummaries[gatewayAddress] ||
              [].length >
                prescribedObservers.length * OBSERVATION_FAILURE_THRESHOLD;
            const wasPrescribed = prescribedObservers.some(
              (observer) => observer.observerAddress === gateway.observerWallet,
            );
            const didObserve =
              prevState.observations[prevState.distributions.epochStartHeight]
                .reports[gateway.observerWallet] !== undefined;
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
