import { Contract, JWKInterface, PstState } from 'warp-contracts/lib/types';

import { getEpochBoundariesForHeight } from '../src/observers';
import { BlockHeight, IOState, WeightedObserver } from '../src/types';
import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  EXAMPLE_OBSERVER_REPORT_TX_IDS,
  INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
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
  let contract: Contract<PstState>;
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
  let height: number;
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
    contract = warp.pst(srcContractId);
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
          height,
        });
      prescribedObservers = result;
      prescribedObserverWallets = wallets.filter((wallet) =>
        prescribedObservers.find(
          (observer: { observerAddress: string }) =>
            observer.observerAddress === wallet.addr,
        ),
      );
      currentEpochStartHeight = getEpochBoundariesForHeight({
        currentBlockHeight: new BlockHeight(height),
        epochZeroBlockHeight: new BlockHeight(DEFAULT_START_HEIGHT),
        epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
      }).epochStartHeight;
    });

    describe('read operations', () => {
      it('should always return the same prescribed observers for the provided block height', async () => {
        const {
          result: refreshPrescribedObservers,
        }: { result: WeightedObserver[] } = await contract.viewState({
          function: 'prescribedObservers',
          height,
        });
        expect(refreshPrescribedObservers).toEqual(prescribedObservers);
      });

      it('should be able to check if target gateway wallet is valid observer for a given epoch', async () => {
        const { result: isPrescribedObserver }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObserver',
            target: prescribedObservers[0].observerAddress,
            height,
          });
        expect(isPrescribedObserver).toBe(true);
      });

      it('should return false if a provided wallet is not an observer for the epoch', async () => {
        const notJoinedGateway = await createLocalWallet(arweave);
        const { result: notPrescribedWallet }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObserver',
            target: notJoinedGateway.address,
          });
        expect(notPrescribedWallet).toBe(false);
      });
    });

    describe('write interactions', () => {
      it('should save observations in epoch if prescribed observer', async () => {
        const writeInteractions = await Promise.all(
          prescribedObserverWallets.map((wallet) => {
            contract = warp.pst(srcContractId).connect(wallet.jwk);
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
            return !Object.keys(newCachedValue.errorMessages).includes(
              interaction?.originalTxId,
            );
          }),
        ).toEqual(true);
        expect(
          newState.observations[currentEpochStartHeight.valueOf()],
        ).toEqual({
          failureSummaries: prescribedObserverWallets.reduce(
            (summary, wallet) => ({
              ...summary,
              [wallet.addr]: [failedGateways[0]],
            }),
            {},
          ),
          reports: prescribedObservers.reduce(
            (report, observer) => ({
              ...report,
              [observer.observerAddress]: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
            }),
            {},
          ),
        });
      });

      it('should allow an observer to update their observation with new failures/report if selected as observer', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const previousState = prevCachedValue.state as IOState;
        const previousSummary =
          previousState.observations[currentEpochStartHeight.valueOf()]
            .failureSummaries;
        const previousReports =
          previousState.observations[currentEpochStartHeight.valueOf()].reports;
        contract = warp
          .pst(srcContractId)
          .connect(prescribedObserverWallets[0].jwk);
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[1],
          failedGateways: failedGateways,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction?.originalTxId,
        );
        expect(
          newState.observations[currentEpochStartHeight.valueOf()],
        ).toEqual({
          failureSummaries: {
            ...previousSummary,
            [prescribedObserverWallets[0].addr]: [
              failedGateways[0],
              failedGateways[1],
            ],
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
        await mineBlocks(arweave, DEFAULT_EPOCH_BLOCK_LENGTH);
        const height = (await getCurrentBlock(arweave)).valueOf();
        // set our start height to the current height
        currentEpochStartHeight = getEpochBoundariesForHeight({
          currentBlockHeight: new BlockHeight(height),
          epochZeroBlockHeight: new BlockHeight(DEFAULT_START_HEIGHT),
          epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
        }).epochStartHeight;
        // get the prescribed observers
        const { result: prescribedObservers }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObservers',
            height,
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
            contract = warp.pst(srcContractId).connect(wallet.jwk);
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
          failureSummaries: prescribedObserverWallets.reduce(
            (summary, wallet) => ({
              ...summary,
              [wallet.addr]: [failedGateways[0], failedGateways[1]],
            }),
            {},
          ),
          reports: prescribedObserverWallets.reduce(
            (report, wallet) => ({
              ...report,
              [wallet.addr]: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
            }),
            {},
          ),
        });
      });

      it('save persist previous observations again if prescribed observer with new gateways', async () => {
        const previousObservation = await contract.readState();
        const prevState = previousObservation.cachedValue.state as IOState;
        const previousReportsAndSummary =
          prevState.observations[currentEpochStartHeight.valueOf()];
        const writeInteractions = await Promise.all(
          prescribedObserverWallets.map((wallet) => {
            contract = warp.pst(srcContractId).connect(wallet.jwk);
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
          writeInteractions.every(
            (interaction) =>
              !Object.keys(newCachedValue.errorMessages).includes(
                interaction?.originalTxId,
              ),
          ),
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
        const height = (await getCurrentBlock(arweave)).valueOf();
        const { result: prescribedObservers }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObservers',
            height,
          });
        const { cachedValue: prevCachedValue } = await contract.readState();
        const nonPrescribedObserverWallet = wallets.find((wallet) => {
          return !prescribedObservers.some(
            (prescribedObserver: { observerAddress: string }) =>
              prescribedObserver.observerAddress === wallet.addr,
          );
        });
        contract = warp
          .pst(srcContractId)
          .connect(nonPrescribedObserverWallet.jwk);
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
          failedGateways: failedGateways,
        });
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction?.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it('should not save observation report if not in the registry and not observer', async () => {
        const notJoinedGateway = await createLocalWallet(arweave);
        const { cachedValue: prevCachedValue } = await contract.readState();
        contract = warp.pst(srcContractId).connect(notJoinedGateway.wallet); // The last wallet in the array is not in the GAR
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
          failedGateways: failedGateways,
        });
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction?.originalTxId,
        );
        expect(
          newCachedValue.errorMessages[writeInteraction?.originalTxId],
        ).toEqual(INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE);
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });
  });
});
