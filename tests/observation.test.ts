import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
  EXAMPLE_OBSERVATION_REPORT_TX_IDS,
} from './utils/constants';
import {
  getCurrentBlock,
  getEpochStart,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';

describe('Observation', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid observer', () => {
    let goodObserver1: JWKInterface;
    let goodObserver2: JWKInterface;
    let goodObserver3: JWKInterface;
    let goodObserver4: JWKInterface;
    let goodObserver5: JWKInterface;
    let failedGateway1: JWKInterface;
    let failedGateway2: JWKInterface;

    beforeAll(async () => {
      failedGateway1 = getLocalWallet(0);
      failedGateway2 = getLocalWallet(1);
      goodObserver1 = getLocalWallet(2);
      goodObserver2 = getLocalWallet(3);
      goodObserver3 = getLocalWallet(4);
      goodObserver4 = getLocalWallet(5);
      goodObserver5 = getLocalWallet(6);
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
        expect(newState.observations).not.toEqual(undefined);

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
        expect(newState.observations[currentEpochStartHeight]).not.toEqual(
          undefined,
        );
      });

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
    let nonValidObserver: JWKInterface;
    let nonValidObserverAddress: string;

    beforeAll(async () => {
      nonValidObserver = getLocalWallet(10);
      contract = warp.pst(srcContractId).connect(nonValidObserver);
      nonValidObserverAddress = await arweave.wallets.getAddress(
        nonValidObserver,
      );
    });

    describe('read interactions', () => {
      it('should be able to fetch gateway details via view state', async () => {
        const { result: gateway } = await contract.viewState({
          function: 'gateway',
          target: ownerAddress,
        });
        const expectedGatewayObj = expect.objectContaining({
          operatorStake: expect.any(Number),
          status: expect.any(String),
          vaults: expect.any(Array),
          settings: expect.any(Object),
        });
        expect(gateway).not.toBe(undefined);
        expect(gateway).toEqual(expectedGatewayObj);
      });
    });

    describe('write interactions', () => {
      it('should not modify gateway settings without already being in GAR', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          status: NETWORK_HIDDEN_STATUS,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction!.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });
  });

  afterAll(async () => {
    const { cachedValue: newCachedValue } = await contract.readState();
    const newState = newCachedValue.state as IOState;
    // console.log(JSON.stringify(newState.gateways, null, 3));
    // console.log(JSON.stringify(newState.observations, null, 3));
  });
});
