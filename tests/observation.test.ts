import { Contract, JWKInterface } from 'warp-contracts';

import { getEpochDataForHeight } from '../src/observers';
import { BlockHeight, IOState, WeightedObserver } from '../src/types';
import {
  DEFAULT_EPOCH_START_HEIGHT,
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  EXAMPLE_OBSERVER_REPORT_TX_IDS,
  INVALID_OBSERVATION_CALLER_MESSAGE,
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
      const height = (await getCurrentBlock(arweave)).valueOf();
      const { result }: { result: WeightedObserver[] } =
        await contract.viewState({
          function: 'prescribedObservers',
        });
      prescribedObservers = result;
      prescribedObserverWallets = wallets.filter((wallet) =>
        prescribedObservers.find(
          (observer: { observerAddress: string }) =>
            observer.observerAddress === wallet.addr,
        ),
      );
      currentEpochStartHeight = getEpochDataForHeight({
        currentBlockHeight: new BlockHeight(height),
        epochZeroStartHeight: new BlockHeight(DEFAULT_EPOCH_START_HEIGHT),
        epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
      }).epochStartHeight;
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

    describe('fast forwarding to the next epoch', () => {
      beforeAll(async () => {
        await mineBlocks(arweave, EPOCH_BLOCK_LENGTH + 1);
        const height = (await getCurrentBlock(arweave)).valueOf();
        // set our start height to the current height
        currentEpochStartHeight = getEpochDataForHeight({
          currentBlockHeight: new BlockHeight(height),
          epochZeroStartHeight: new BlockHeight(DEFAULT_EPOCH_START_HEIGHT),
          epochBlockLength: new BlockHeight(EPOCH_BLOCK_LENGTH),
        }).epochStartHeight;
        // get the prescribed observers
        const { result: prescribedObservers }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObservers',
          });
        // find their wallets
        prescribedObserverWallets = wallets.filter((wallet) =>
          prescribedObservers.find(
            (observer: { observerAddress: string }) =>
              observer.observerAddress === wallet.addr,
          ),
        );
      });

      it('should save observations if prescribed observer with all using multiple failed gateways', async () => {
        const writeInteractions = await Promise.all(
          prescribedObserverWallets.map((wallet) => {
            contract = warp
              .contract<IOState>(srcContractId)
              .connect(wallet.jwk);
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
            contract = warp
              .contract<IOState>(srcContractId)
              .connect(wallet.jwk);
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
        expect(
          newState.observations[currentEpochStartHeight.valueOf()],
        ).toEqual({
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
});
