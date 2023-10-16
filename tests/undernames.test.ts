import { Contract, JWKInterface } from 'warp-contracts';

import {
  DEFAULT_UNDERNAME_COUNT,
  INVALID_INPUT_MESSAGE,
  MAX_ALLOWED_UNDERNAMES,
} from '../src/constants';
import { IOState } from '../src/types';
import {
  calculateUndernamePermutations,
  getLocalArNSContractId,
  getLocalWallet,
} from './utils/helper';
import { warp } from './utils/services';

describe('undernames', () => {
  let contract: Contract<IOState>;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('any address', () => {
    let nonContractOwner: JWKInterface;
    const arnsName = 'name1';

    beforeAll(async () => {
      nonContractOwner = getLocalWallet(1);
      contract = warp
        .contract<IOState>(srcContractId)
        .connect(nonContractOwner);
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
          const {
            cachedValue: { state: prevState },
          } = await contract.readState();
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
          const {
            cachedValue: { state: prevState },
          } = await contract.readState();
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
        calculateUndernamePermutations(arnsName) + 1,
        calculateUndernamePermutations(arnsName) + DEFAULT_UNDERNAME_COUNT + 1,
        calculateUndernamePermutations(arnsName) + 100,
        MAX_ALLOWED_UNDERNAMES,
        MAX_ALLOWED_UNDERNAMES + 1,
      ])(
        'should throw an error when a quantity over the max allowed undernames is provided: %s',
        async (badQty) => {
          const undernameInput = {
            name: arnsName,
            qty: badQty,
          };
          const {
            cachedValue: { state: prevState },
          } = await contract.readState();
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
      const arnsName = 'name1';

      it.each([
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        100,
        1000,
        MAX_ALLOWED_UNDERNAMES - DEFAULT_UNDERNAME_COUNT - 1165, // 1165 is the sum of the previous undername tests
      ])(
        'should successfully increase undernames with valid quantity provided: : %s',
        async (goodQty) => {
          const undernameInput = {
            name: arnsName,
            qty: goodQty,
          };
          const {
            cachedValue: { state: prevState },
          } = await contract.readState();
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

      it.each(['name1', 'name2', 'name3'])(
        'should successfully increase undernames with valid name provided: : %s',
        async (validName) => {
          const undernameInput = {
            name: validName,
            qty: 1,
          };
          const {
            cachedValue: { state: prevState },
          } = await contract.readState();
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
});
