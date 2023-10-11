import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/types';
import { arweave, warp } from './setup.jest';
import { EXAMPLE_OBSERVATION_REPORT_TX_ID } from './utils/constants';
import { getLocalArNSContractId, getLocalWallet } from './utils/helper';

describe('Observation', () => {
  let contract: Contract<PstState>;
  let owner: JWKInterface;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid observer', () => {
    let newObserver: JWKInterface;
    let failedGateway1: JWKInterface;
    let failedGateway2: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      failedGateway1 = getLocalWallet(1);
      failedGateway2 = getLocalWallet(2);
      newObserver = getLocalWallet(5);
      contract = warp.pst(srcContractId).connect(newObserver);
    });

    describe('save observation', () => {
      it('should save observations if selected as observer', async () => {
        const failedGateways = [
          await arweave.wallets.getAddress(failedGateway1),
          await arweave.wallets.getAddress(failedGateway2),
        ];
        const writeInteraction = await contract.writeInteraction({
          function: 'saveObservations',
          observationReportTxId: EXAMPLE_OBSERVATION_REPORT_TX_ID,
          failedGateways,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction!.originalTxId,
        );
        expect(newState.observations).not.toEqual(undefined);
      });
    });
  });
});
