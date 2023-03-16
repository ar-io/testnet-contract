import * as fs from 'fs';
import path from 'path';
import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../src/contracts/types/types';
import { arweave, warp } from './setup.jest';
import { DEFAULT_NON_CONTRACT_OWNER_MESSAGE } from './utils/constants';
import {
  getLocalArNSContractId,
  getLocalWallet,
  mineBlock,
} from './utils/helper';

describe('Evolve', () => {
  let contract: Contract<PstState>;
  let srcContractId: string;
  let newLocalSourceCodeJS;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
    newLocalSourceCodeJS = fs.readFileSync(
      path.join(__dirname, '../dist/contract.js'),
      'utf8',
    );
  });

  describe('contract owner', () => {
    let owner: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      contract = warp.pst(srcContractId).connect(owner);
    });

    it('should be able to evolve source contract', async () => {
      const evolveSrcTx = await warp.createSource(
        { src: newLocalSourceCodeJS },
        owner,
      );
      const evolveSrcTxId = await warp.saveSource(evolveSrcTx);

      await mineBlock(arweave);

      const evolveInteraction = await contract.evolve(evolveSrcTxId, {
        disableBundling: true,
      });

      expect(evolveInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).not.toContain(
        evolveInteraction!.originalTxId,
      );
      expect(state.evolve).toEqual(evolveSrcTxId);
    });
  });

  describe('non-contract owner', () => {
    let nonContractOwner: JWKInterface;

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp.pst(srcContractId).connect(nonContractOwner);
    });

    it('should not be able to evolve the contract', async () => {
      const evolveSrcTx = await warp.createSource(
        { src: newLocalSourceCodeJS },
        nonContractOwner,
      );
      const evolveSrcTxId = await warp.saveSource(evolveSrcTx);
      const { cachedValue: prevCachedValue } = await contract.readState();
      const prevState = prevCachedValue.state as IOState;

      await mineBlock(arweave);

      const evolveInteraction = await contract.evolve(evolveSrcTxId, {
        disableBundling: true,
      });

      expect(evolveInteraction?.originalTxId).not.toBe(undefined);
      const { cachedValue } = await contract.readState();
      const state = cachedValue.state as IOState;
      expect(Object.keys(cachedValue.errorMessages)).toContain(
        evolveInteraction!.originalTxId,
      );
      expect(
        cachedValue.errorMessages[evolveInteraction!.originalTxId],
      ).toEqual(DEFAULT_NON_CONTRACT_OWNER_MESSAGE);
      expect(state.evolve).toEqual(prevState.evolve);
    });
  });
});
