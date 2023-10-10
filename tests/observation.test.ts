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
    let newObserverAddress: string;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      newObserver = getLocalWallet(5);
      newObserverAddress = await arweave.wallets.getAddress(newObserver);
      contract = warp.pst(srcContractId).connect(newObserver);
    });

    describe('save observation', () => {
      it('should save observations if selected as observer', async () => {
        const failedGateways = [
          '36Ar8VmyC7YS7JGaep9ca2ANjLABETTpxSeA7WOV45Y',
          'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA',
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

  afterAll(async () => {
    const { cachedValue: newCachedValue } = await contract.readState();
    const newState = newCachedValue.state as IOState;
    console.log(newState);
  });
});
