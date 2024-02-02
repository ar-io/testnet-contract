import { Contract, JWKInterface } from 'warp-contracts';

import {
  INVALID_INPUT_MESSAGE,
  MAX_ALLOWED_UNDERNAMES,
} from '../src/constants';
import { IOState } from '../src/types';
import { getLocalArNSContractKey, getLocalWallet } from './utils/helper';
import { warp } from './utils/services';

describe('undernames', () => {
  let contract: Contract<IOState>;
  let srcContractId: string;
  let nonContractOwner: JWKInterface;
  let prevState: IOState;

  const arnsName = 'name-1';

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
    nonContractOwner = getLocalWallet(1);
    contract = warp.contract<IOState>(srcContractId).connect(nonContractOwner);
  });

  beforeEach(async () => {
    // tick so we are always working off freshest state
    await contract.writeInteraction({ function: 'tick' });
    prevState = (await contract.readState()).cachedValue.state as IOState;
  });

  describe('Submits undername increase', () => {
    it.each([
      '',
      '*&*##$%#',
      '-leading',
      'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
      'test.subdomain.name',
      false,
      true,
      0,
      1,
      3.5,
    ])(
      'should throw an error when an invalid name is submitted: %s',
      async (badName) => {
        const undernameInput = {
          name: badName,
          qty: 1,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'increaseUndernameCount',
            ...undernameInput,
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
      },
    );

    it.each([
      '',
      '*&*##$%#',
      '-leading',
      'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
      'test.subdomain.name',
      false,
      true,
      0.5,
      0,
      Infinity,
      -Infinity,
      -1,
      -1000,
    ])(
      'should throw an error when an invalid quantity is provided: %s',
      async (badQty) => {
        const undernameInput = {
          name: arnsName,
          qty: badQty,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'increaseUndernameCount',
            ...undernameInput,
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
      },
    );

    it.each([
      MAX_ALLOWED_UNDERNAMES,
      MAX_ALLOWED_UNDERNAMES + 1,
      Number.MAX_SAFE_INTEGER,
    ])(
      'should throw an error when a quantity over the max allowed undernames is provided: %s',
      async (badQty) => {
        const undernameInput = {
          name: arnsName,
          qty: badQty,
        };
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'increaseUndernameCount',
            ...undernameInput,
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(
          cachedValue.errorMessages[writeInteraction.originalTxId],
        ).toEqual(expect.stringContaining(INVALID_INPUT_MESSAGE));
        expect(cachedValue.state).toEqual(prevState);
      },
    );
  });

  describe('with valid input', () => {
    const arnsName = 'name-1';

    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 1000])(
      'should successfully increase undernames with valid quantity provided: %s',
      async (goodQty) => {
        const undernameInput = {
          name: arnsName,
          qty: goodQty,
        };
        const initialUndernameCount = prevState.records[arnsName].undernames;
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'increaseUndernameCount',
            ...undernameInput,
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(cachedValue.state.records[arnsName].undernames).toEqual(
          initialUndernameCount + goodQty,
        );
        // TODO: balance checks
      },
    );

    it.each(['name-1', 'name-2', 'name-3'])(
      'should successfully increase undernames with valid name provided: %s',
      async (validName) => {
        const undernameInput = {
          name: validName,
          qty: 1,
        };

        const initialUndernameCount = prevState.records[validName].undernames;
        const writeInteraction = await contract.writeInteraction(
          {
            function: 'increaseUndernameCount',
            ...undernameInput,
          },
          {
            disableBundling: true,
          },
        );

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue } = await contract.readState();
        expect(Object.keys(cachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(cachedValue.state.records[validName].undernames).toEqual(
          initialUndernameCount + 1,
        );
        // TODO: balance checks
      },
    );
  });
});
