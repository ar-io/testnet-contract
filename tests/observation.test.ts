import { Contract, JWKInterface, PstState } from 'warp-contracts/lib/types';

import { getEpochStart } from '../src/observers';
import { BlockHeight, IOState, WeightedObserver } from '../src/types';
import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  EXAMPLE_LIST_OF_FAILED_GATEWAYS,
  EXAMPLE_OBSERVER_REPORT_TX_IDS,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  NUM_OBSERVERS_PER_EPOCH,
  WALLETS_TO_CREATE,
} from './utils/constants';
import {
  createLocalWallet,
  getCurrentBlock,
  getLocalArNSContractKey,
  getLocalWallet,
  getRandomFailedGatewaysSubset,
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
  });

  describe('valid observer', () => {
    describe('read operations', () => {
      let height: number;
      let prescribedObserversForHeight: WeightedObserver[] = [];

      beforeEach(async () => {
        height = (await getCurrentBlock(arweave)).valueOf();
        const { result }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObservers',
            height,
          });
        prescribedObserversForHeight = result;
      });

      it('should get prescribed observers with height', async () => {
        expect(prescribedObserversForHeight).toHaveLength(
          NUM_OBSERVERS_PER_EPOCH,
        );
      });

      it('should get prescribed observers without height', async () => {
        const { result: prescribedObserversWithoutHeight } =
          await contract.viewState({
            function: 'prescribedObservers',
          });
        expect(prescribedObserversWithoutHeight).toEqual(
          prescribedObserversForHeight,
        );
      });

      it('should be able to check if target gateway wallet is valid observer for a given epoch', async () => {
        const {
          result: prescribedGatewayWallet,
        }: { result: WeightedObserver[] } = await contract.viewState({
          function: 'prescribedObserver',
          target: prescribedObserversForHeight[0].gatewayAddress,
          height,
        });
        expect(prescribedGatewayWallet).toBe(true);
      });

      it('should be able to check if target observer wallet is valid observer for a given epoch', async () => {
        const {
          result: prescribedObserverWallet,
        }: { result: WeightedObserver[] } = await contract.viewState({
          function: 'prescribedObserver',
          target: prescribedObserversForHeight[0].observerAddress,
          height,
        });
        expect(prescribedObserverWallet).toBe(true);
      });

      it('should be able to check if target wallet is not a valid observer for a given epoch', async () => {
        const notJoinedGateway = await createLocalWallet(arweave);
        const { result: notPrescribedWallet }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObserver',
            target: notJoinedGateway.address,
            height,
          });
        expect(notPrescribedWallet).toBe(false);
      });
    });

    describe('valid observer', () => {
      let prescribedObserverWallets: {
        addr: string;
        jwk: JWKInterface;
      }[] = [];
      let currentEpochStartHeight: BlockHeight;

      beforeEach(async () => {
        const height = await getCurrentBlock(arweave);
        const { result: prescribedObservers }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObservers',
            height: height.valueOf(),
          });
        prescribedObserverWallets = wallets.filter((wallet) =>
          prescribedObservers.find(
            (observer: { gatewayAddress: string }) =>
              observer.gatewayAddress === wallet.addr,
          ),
        );
        currentEpochStartHeight = getEpochStart({
          startHeight: new BlockHeight(DEFAULT_START_HEIGHT),
          epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
          height,
        });
      });

      it('should save observations in epoch if prescribed observer with single failed gateway', async () => {
        const writeInteractions = await Promise.all(
          prescribedObserverWallets.map((wallet) => {
            contract = warp.pst(srcContractId).connect(wallet.jwk);
            return contract.writeInteraction({
              function: 'saveObservations',
              observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
              failedGateways: [wallets[0].addr],
            });
          }),
        );
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        const reportLength = Object.keys(
          newState.observations[currentEpochStartHeight.valueOf()].reports,
        ).length;
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
        expect(reportLength).toEqual(NUM_OBSERVERS_PER_EPOCH);
      });

      it('should allow an observer to update their observation with new failures/report if selected as observer', async () => {
        contract = warp
          .pst(srcContractId)
          .connect(prescribedObserverWallets[0].jwk);
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[1],
          failedGateways: getRandomFailedGatewaysSubset(gatewayWalletAddresses),
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction?.originalTxId,
        );
        expect(
          newState.observations[currentEpochStartHeight.valueOf()].reports[
            prescribedObserverWallets[0].addr
          ],
        ).toEqual(EXAMPLE_OBSERVER_REPORT_TX_IDS[1]);
      });
    });

    describe('fast forwarding to the next epoch', () => {
      let prescribedObserverWallets: {
        addr: string;
        jwk: JWKInterface;
      }[] = [];
      let currentEpochStartHeight: BlockHeight;
      let failedGateways: string[] = [];

      beforeAll(async () => {
        await mineBlocks(arweave, DEFAULT_EPOCH_BLOCK_LENGTH);
        const height = await getCurrentBlock(arweave);
        currentEpochStartHeight = getEpochStart({
          startHeight: new BlockHeight(DEFAULT_START_HEIGHT),
          epochBlockLength: new BlockHeight(DEFAULT_EPOCH_BLOCK_LENGTH),
          height,
        });
        const { result: prescribedObservers }: { result: WeightedObserver[] } =
          await contract.viewState({
            function: 'prescribedObservers',
            height: height.valueOf(),
          });
        prescribedObserverWallets = wallets.filter((wallet) =>
          prescribedObservers.find(
            (observer: { gatewayAddress: string }) =>
              observer.gatewayAddress === wallet.addr,
          ),
        );
        failedGateways = getRandomFailedGatewaysSubset(gatewayWalletAddresses);
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
        const newState = newCachedValue.state as IOState;
        const reportLength = Object.keys(
          newState.observations[currentEpochStartHeight.valueOf()].reports,
        ).length;
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
        expect(reportLength).toEqual(NUM_OBSERVERS_PER_EPOCH);
      });

      it('save observations again if prescribed observer with random failed gateways', async () => {
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
        const newState = newCachedValue.state as IOState;
        const reportLength = Object.keys(
          newState.observations[currentEpochStartHeight.valueOf()].reports,
        ).length;
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
        expect(reportLength).toEqual(NUM_OBSERVERS_PER_EPOCH);
      });

      it('should save observations again if prescribed observer using observer wallet address', async () => {
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
        const newState = newCachedValue.state as IOState;
        const reportLength = Object.keys(
          newState.observations[currentEpochStartHeight.valueOf()].reports,
        ).length;
        expect(
          writeInteractions.every((interaction) => interaction?.originalTxId),
        ).toEqual(true);

        // expect(
        //   writeInteractions.every((interaction) => {
        //     return !Object.keys(newCachedValue.errorMessages).includes(
        //       interaction?.originalTxId,
        //     );
        //   }),
        // ).toEqual(true);
        expect(reportLength).toEqual(NUM_OBSERVERS_PER_EPOCH);
      });

      describe('invalid inputs', () => {
        beforeAll(() => {
          contract = warp
            .pst(srcContractId)
            .connect(prescribedObserverWallets[0].jwk);
        });

        it.each([undefined, 'bad-tx-id', 100])(
          'it must not allow interactions with malformed report tx id',
          async (observerReportTxId) => {
            const { cachedValue: prevCachedValue } = await contract.readState();
            const writeInteraction = await contract.writeInteraction({
              function: 'saveObservations',
              observerReportTxId,
              failedGateways: getRandomFailedGatewaysSubset(
                gatewayWalletAddresses,
              ),
            });
            const { cachedValue: newCachedValue } = await contract.readState();
            expect(Object.keys(newCachedValue.errorMessages)).toContain(
              writeInteraction?.originalTxId,
            );
            expect(newCachedValue.state).toEqual(prevCachedValue.state);
          },
        );

        it.each([
          undefined,
          gatewayWalletAddresses[0], // should reject this because it is not an array
          ['bad-tx-id'],
          [100],
          [EXAMPLE_LIST_OF_FAILED_GATEWAYS],
        ])(
          'it must not allow interactions with malformed failed gateways',
          async (failedGateways) => {
            const { cachedValue: prevCachedValue } = await contract.readState();
            const writeInteraction = await contract.writeInteraction({
              function: 'saveObservations',
              observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
              failedGateways,
            });
            const { cachedValue: newCachedValue } = await contract.readState();
            expect(Object.keys(newCachedValue.errorMessages)).toContain(
              writeInteraction?.originalTxId,
            );
            expect(newCachedValue.state).toEqual(prevCachedValue.state);
          },
        );
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
        // Connect as an invalid observer
        for (let i = 0; i < WALLETS_TO_CREATE; i++) {
          if (
            !prescribedObservers.some(
              (observer: { gatewayAddress: string }) =>
                observer.gatewayAddress === wallets[i].addr,
            )
          ) {
            contract = warp.pst(srcContractId).connect(wallets[i].jwk);
            break;
          }
        }
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observerReportTxId: EXAMPLE_OBSERVER_REPORT_TX_IDS[0],
          failedGateways: getRandomFailedGatewaysSubset(gatewayWalletAddresses),
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
          failedGateways: getRandomFailedGatewaysSubset(gatewayWalletAddresses),
        });
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction?.originalTxId,
        );
        expect(
          newCachedValue.errorMessages[writeInteraction?.originalTxId],
        ).toEqual(INVALID_OBSERVATION_CALLER_MESSAGE);
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });
  });
});
