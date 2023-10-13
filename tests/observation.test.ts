import { Contract, JWKInterface, PstState } from 'warp-contracts/lib/types';

import { IOState } from '../src/types';
import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  EXAMPLE_LIST_OF_FAILED_GATEWAYS,
  EXAMPLE_OBSERVATION_REPORT_TX_IDS,
} from './utils/constants';
import {
  getCurrentBlock,
  getEpochStart,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Observation', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;
  // TODO: MAKE ALL THIS BETTER
  let goodObserver1: JWKInterface;
  let goodObserver2: JWKInterface;
  let leavingFirstEpochObserver: JWKInterface;
  let goodObserver3: JWKInterface;
  let joiningSecondEpochObserver: JWKInterface;
  let failedGateway1: JWKInterface;
  let failedGateway2: JWKInterface;
  let nonValidObserver: JWKInterface;
  let goodObserver1Address: string;
  let goodObserver2Address: string;
  let goodObserver3Address: string;
  let leavingFirstEpochObserverAddress: string;
  let joiningSecondEpochObserverAddress: string;
  let nonValidObserverAddress: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
    failedGateway1 = getLocalWallet(0);
    failedGateway2 = getLocalWallet(1);
    goodObserver1 = getLocalWallet(2);
    goodObserver2 = getLocalWallet(3);
    leavingFirstEpochObserver = getLocalWallet(4);
    goodObserver3 = getLocalWallet(5);
    joiningSecondEpochObserver = getLocalWallet(6); // This wallet does not join until mid-second epoch.
    nonValidObserver = getLocalWallet(10);
    nonValidObserverAddress = await arweave.wallets.getAddress(
      nonValidObserver,
    );
    joiningSecondEpochObserverAddress = await arweave.wallets.getAddress(
      joiningSecondEpochObserver,
    );
    leavingFirstEpochObserverAddress = await arweave.wallets.getAddress(
      leavingFirstEpochObserver,
    );
    goodObserver2Address = await arweave.wallets.getAddress(goodObserver2);
    goodObserver3Address = await arweave.wallets.getAddress(goodObserver3);
  });

  describe('valid observer', () => {
    beforeAll(async () => {
      contract = warp.pst(srcContractId).connect(goodObserver1);
    });

    describe('valid observer', () => {
      it('should save first observation in epoch if selected as observer', async () => {
        const height = await getCurrentBlock(arweave);
        const currentEpochStartHeight = getEpochStart({
          startHeight: DEFAULT_START_HEIGHT,
          epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
          height,
        });
        const failedGateways = [
          await arweave.wallets.getAddress(failedGateway1),
          await arweave.wallets.getAddress(failedGateway2),
        ];
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[0],
          failedGateways,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(newState.observations[currentEpochStartHeight]).not.toEqual(
          undefined,
        );
      });

      it('should allow multiple observations in epoch if selected as observer', async () => {
        contract = warp.pst(srcContractId).connect(goodObserver2);
        let failedGateways = [
          await arweave.wallets.getAddress(failedGateway1),
          await arweave.wallets.getAddress(failedGateway2),
        ];
        let writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[0],
          failedGateways,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        let newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        contract = warp.pst(srcContractId).connect(goodObserver3);
        failedGateways = [
          await arweave.wallets.getAddress(failedGateway1),
          await arweave.wallets.getAddress(goodObserver1),
        ];
        writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[0],
          failedGateways,
        });
        const height = await getCurrentBlock(arweave);
        const currentEpochStartHeight = getEpochStart({
          startHeight: DEFAULT_START_HEIGHT,
          epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
          height,
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue2 } = await contract.readState();
        newState = newCachedValue2.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newState.observations[currentEpochStartHeight].reports[
            goodObserver2Address
          ],
        ).toEqual(EXAMPLE_OBSERVATION_REPORT_TX_IDS[0]);
        expect(
          newState.observations[currentEpochStartHeight].reports[
            goodObserver3Address
          ],
        ).toEqual(EXAMPLE_OBSERVATION_REPORT_TX_IDS[0]);
      });

      it.each([undefined, 'bad-tx-id', 100])(
        'it must not allow interactions with malformed report tx id',
        async (observationReportTxId) => {
          const height = await getCurrentBlock(arweave);
          const currentEpochStartHeight = getEpochStart({
            startHeight: DEFAULT_START_HEIGHT,
            epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
            height,
          });
          const failedGateways = [goodObserver3Address];
          const writeInteraction = await contract.writeInteraction({
            function: 'saveObservations',
            observationReportTxId,
            failedGateways,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          const newState = newCachedValue.state as IOState;
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction!.originalTxId,
          );
          expect(
            newState.observations[currentEpochStartHeight].reports[
              goodObserver3Address
            ],
          ).not.toEqual(observationReportTxId);
        },
      );

      it.each([
        undefined,
        goodObserver3Address, // should reject this because it is not an array
        ['bad-tx-id'],
        [100],
        [EXAMPLE_LIST_OF_FAILED_GATEWAYS],
      ])(
        'it must not allow interactions with malformed failed gateways',
        async (failedGateways) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'saveObservations',
            observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[0],
            failedGateways,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction!.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );
      // add

      it('should allow an observer to update their observation with new failures/report if selected as observer', async () => {
        contract = warp.pst(srcContractId).connect(goodObserver1);
        const height = await getCurrentBlock(arweave);
        const currentEpochStartHeight = getEpochStart({
          startHeight: DEFAULT_START_HEIGHT,
          epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
          height,
        });
        const failedGateways = [
          await arweave.wallets.getAddress(goodObserver2),
        ];
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[1],
          failedGateways,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(newState.observations[currentEpochStartHeight]).not.toEqual(
          undefined,
        );
      });
    });
  });

  describe('non-valid observer', () => {
    beforeAll(async () => {
      goodObserver1Address = await arweave.wallets.getAddress(goodObserver1);
      contract = warp.pst(srcContractId).connect(nonValidObserver);
    });

    describe('read interactions', () => {
      it('should be able to check if target is valid observer for a given epoch', async () => {
        const height = await getCurrentBlock(arweave);
        const { result: isPrescribedObserver } = await contract.viewState({
          function: 'isPrescribedObserver',
          target: nonValidObserverAddress,
          height,
        });
        expect(isPrescribedObserver).toBe(false);
        const { result: isPrescribedObserver2 } = await contract.viewState({
          function: 'isPrescribedObserver',
          target: goodObserver1Address,
          height,
        });
        expect(isPrescribedObserver2).toBe(true);
      });
    });

    describe('write interactions', () => {
      it('should not save observation report if not in the GAR', async () => {
        const height = await getCurrentBlock(arweave);
        const currentEpochStartHeight = getEpochStart({
          startHeight: DEFAULT_START_HEIGHT,
          epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
          height,
        });
        const failedGateways = [
          await arweave.wallets.getAddress(failedGateway1),
          await arweave.wallets.getAddress(failedGateway2),
        ];
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[0],
          failedGateways,
        });
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newState.observations[currentEpochStartHeight].reports[
            nonValidObserverAddress
          ],
        ).toEqual(undefined);
      });

      it('should not save observation report if gateway is leaving', async () => {
        contract = warp.pst(srcContractId).connect(leavingFirstEpochObserver);
        const height = await getCurrentBlock(arweave);
        const currentEpochStartHeight = getEpochStart({
          startHeight: DEFAULT_START_HEIGHT,
          epochBlockLength: DEFAULT_EPOCH_BLOCK_LENGTH,
          height,
        });
        const failedGateways = [
          await arweave.wallets.getAddress(failedGateway1),
          await arweave.wallets.getAddress(failedGateway2),
        ];
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_IDS[0],
          failedGateways,
        });
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(
          newState.observations[currentEpochStartHeight].reports[
            leavingFirstEpochObserverAddress
          ],
        ).toEqual(undefined);
      });
    });
  });

  afterAll(async () => {
    const { cachedValue: newCachedValue } = await contract.readState();
    const newState = newCachedValue.state as IOState;
    console.log(JSON.stringify(newState.gateways, null, 3)); // eslint-disable-line
    console.log(JSON.stringify(newState.observations, null, 3)); // eslint-disable-line
  });
});
