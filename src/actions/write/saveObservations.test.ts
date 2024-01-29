import {
  EPOCH_BLOCK_LENGTH,
  EPOCH_DISTRIBUTION_DELAY,
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  NETWORK_LEAVING_STATUS,
} from '../../constants';
import {
  getBaselineState,
  stubbedArweaveTxId,
  stubbedGatewayData,
} from '../../tests/stubs';
import { IOState, Observations } from '../../types';
import { saveObservations } from './saveObservations';

describe('saveObservations', () => {
  beforeEach(() => {
    SmartWeave.block.height = 1;
  });

  describe('current block height is less than the epochZeroStartHeight', () => {
    it('should throw an error if epoch zero has not started', async () => {
      const initialState: IOState = {
        ...getBaselineState(),
        distributions: {
          epochZeroStartHeight: 10,
          epochStartHeight: 10,
          epochEndHeight: 10 + EPOCH_BLOCK_LENGTH - 1,
          epochPeriod: 0,
          nextDistributionHeight:
            10 + EPOCH_BLOCK_LENGTH - 1 + EPOCH_DISTRIBUTION_DELAY,
        },
      };
      SmartWeave.block.height =
        initialState.distributions.epochZeroStartHeight - 1;
      const error = await saveObservations(initialState, {
        caller: 'observer-address',
        input: {
          observerReportTxId: stubbedArweaveTxId,
          failedGateways: [],
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        `Observations for the current epoch cannot be submitted before block height: ${
          initialState.distributions.epochStartHeight + EPOCH_DISTRIBUTION_DELAY
        }`,
      );
    });
  });

  describe('current block height is less than the epochStartHeight + delayPeriod', () => {
    it('should throw an error if the current block height is less than the epochStartHeight + delayPeriod even if the observer is prescribed', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          'observer-address': {
            ...stubbedGatewayData,
            observerWallet: 'observer-address',
          },
        },
      };
      const error = await saveObservations(initialState, {
        caller: 'observer-address',
        input: {
          observerReportTxId: stubbedArweaveTxId,
          failedGateways: [],
        },
      }).catch((e: any) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        `Observations for the current epoch cannot be submitted before block height: ${
          initialState.distributions.epochStartHeight + EPOCH_DISTRIBUTION_DELAY
        }`,
      );
    });
  });

  describe('current block height is greater than the epochStartHeight + delayPeriod', () => {
    beforeEach(() => {
      // set the current height to one that allows observations to be submitted
      SmartWeave.block.height =
        getBaselineState().distributions.epochStartHeight +
        EPOCH_DISTRIBUTION_DELAY;
      1;
    });

    describe('invalid inputs', () => {
      it.each([
        [
          'should throw an error if the observerReportTxId is not properly formatted',
          {
            ...getBaselineState(),
          },
          {
            caller: 'fake-caller',
            input: {
              observerReportTxId: 'invalid-tx-id',
              failedGateways: [],
            },
          },
          INVALID_INPUT_MESSAGE,
        ],
        [
          'should throw an error if the failedGateways is not an array',
          {
            ...getBaselineState(),
          },
          {
            caller: 'fake-caller',
            input: {
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: {},
            },
          },
          INVALID_INPUT_MESSAGE,
        ],
        [
          'should throw an error if the failedGateways is not an array of fqdns',
          {
            ...getBaselineState(),
          },
          {
            caller: 'fake-caller',
            input: {
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: ['invalid-fqdn'],
            },
          },
          INVALID_INPUT_MESSAGE,
        ],
      ])('%s', async (_, initialState: IOState, inputData, errorMessage) => {
        const error = await saveObservations(initialState, inputData).catch(
          (e) => e,
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(expect.stringContaining(errorMessage));
      });
    });

    describe('valid input', () => {
      describe('invalid caller', () => {
        it.each([
          [
            'should throw an error if the caller is not a prescribed observer wallet for the epoch',
            {
              ...getBaselineState(),
              gateways: {
                [stubbedArweaveTxId]: stubbedGatewayData,
              },
            },
            {
              caller: 'fake-caller',
              input: {
                observerReportTxId: stubbedArweaveTxId,
                failedGateways: [],
              },
            },
            INVALID_OBSERVATION_CALLER_MESSAGE,
          ],
          [
            'should throw an error if the caller is a registered gateway that has not started observing yet',
            {
              ...getBaselineState(),
              gateways: {
                ['observer-address']: {
                  ...stubbedGatewayData,
                  start: 10,
                  observerWallet: 'observer-address',
                },
              },
            },
            {
              caller: 'observer-address',
              input: {
                observerReportTxId: stubbedArweaveTxId,
                failedGateways: [],
              },
            },
            INVALID_OBSERVATION_CALLER_MESSAGE,
          ],
          [
            'should throw an error if the caller is not a prescribed observer for the epoch',
            {
              ...getBaselineState(),
              gateways: {
                'fake-observer-wallet': {
                  ...stubbedGatewayData,
                  observerWallet: 'fake-observer-wallet',
                },
              },
            },
            {
              caller: 'fake-observer-wallet',
              input: {
                observerReportTxId: stubbedArweaveTxId,
                failedGateways: [],
              },
            },
            INVALID_OBSERVATION_CALLER_MESSAGE,
          ],
        ])('%s', async (_, initialState: IOState, inputData, errorMessage) => {
          await saveObservations(initialState, inputData).catch((e: any) => {
            expect(e).toBeInstanceOf(Error);
            expect(e.message).toEqual(errorMessage);
          });
        });
      });

      describe('valid caller', () => {
        it('should not save a gateway to the observations list for the epoch if it is already there', async () => {
          const existingObservations: Observations = {
            [0]: {
              failureSummaries: {
                [stubbedArweaveTxId]: ['observer-address'],
              },
              reports: {},
            },
          };
          const initialState = {
            ...getBaselineState(),
            gateways: {
              'observer-address': {
                ...stubbedGatewayData,
                observerWallet: 'observer-address',
              },
              [stubbedArweaveTxId]: {
                ...stubbedGatewayData,
                observerAddress: stubbedArweaveTxId,
              },
            },
            observations: existingObservations,
          };
          // set the current height to one that allows observations to be submitted
          SmartWeave.block.height =
            initialState.distributions.epochStartHeight +
            EPOCH_DISTRIBUTION_DELAY +
            1;
          const { state } = await saveObservations(initialState, {
            caller: 'observer-address',
            input: {
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: [stubbedArweaveTxId],
            },
          });
          const expectedState = {
            ...initialState,
            observations: {
              [0]: {
                failureSummaries: {
                  [stubbedArweaveTxId]: ['observer-address'],
                },
                reports: {
                  'observer-address': stubbedArweaveTxId,
                },
              },
            },
          };
          expect(state).toEqual(expectedState);
        });
      });

      it('should not save a gateway to the failure summaries for the epoch if it the observed gateway does not exist in the registry', async () => {
        const initialState = {
          ...getBaselineState(),
          gateways: {
            'observer-address': {
              ...stubbedGatewayData,
              observerWallet: 'observer-address',
            },
          },
        };
        // set the current height to one that allows observations to be submitted
        SmartWeave.block.height =
          initialState.distributions.epochStartHeight +
          EPOCH_DISTRIBUTION_DELAY +
          1;
        const { state } = await saveObservations(initialState, {
          caller: 'observer-address',
          input: {
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: [stubbedArweaveTxId],
          },
        });
        const expectedState = {
          ...initialState,
          observations: {
            [0]: {
              failureSummaries: {},
              reports: {
                'observer-address': stubbedArweaveTxId,
              },
            },
          },
        };
        expect(state).toEqual(expectedState);
      });

      it('should not save a gateway to the failure summaries for the epoch if it the observed gateway has not yet started serving', async () => {
        const initialState = {
          ...getBaselineState(),
          gateways: {
            'observer-address': {
              ...stubbedGatewayData,
              observerWallet: 'observer-address',
            },
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
              start: 10,
              observerWallet: stubbedArweaveTxId,
            },
          },
        };
        const { state } = await saveObservations(initialState, {
          caller: 'observer-address',
          input: {
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: [stubbedArweaveTxId],
          },
        });
        const expectedState = {
          ...initialState,
          observations: {
            [0]: {
              failureSummaries: {},
              reports: {
                'observer-address': stubbedArweaveTxId,
              },
            },
          },
        };
        expect(state).toEqual(expectedState);
      });

      it('should not save a gateway to the failure summaries for the epoch if it the observed gateway is currently leaving the network', async () => {
        const initialState: IOState = {
          ...getBaselineState(),
          gateways: {
            'observer-address': {
              ...stubbedGatewayData,
              observerWallet: 'observer-address',
            },
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
              status: NETWORK_LEAVING_STATUS,
            },
          },
        };
        const { state } = await saveObservations(initialState, {
          caller: 'observer-address',
          input: {
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: [stubbedArweaveTxId],
          },
        });
        const expectedState = {
          ...initialState,
          observations: {
            [0]: {
              failureSummaries: {},
              reports: {
                'observer-address': stubbedArweaveTxId,
              },
            },
          },
        };
        expect(state).toEqual(expectedState);
      });

      it('should create the epoch observations object and save observed gateway summaries if it does not already exist', async () => {
        const initialState = {
          ...getBaselineState(),
          gateways: {
            'observer-address': {
              ...stubbedGatewayData,
              observerWallet: 'observer-address',
            },
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
              observerAddress: stubbedArweaveTxId,
            },
          },
          observations: {},
        };
        const { state } = await saveObservations(initialState, {
          caller: 'observer-address',
          input: {
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: [stubbedArweaveTxId],
          },
        });
        const expectedObservationsForEpoch: Observations = {
          [0]: {
            failureSummaries: {
              [stubbedArweaveTxId]: ['observer-address'],
            },
            reports: {
              'observer-address': stubbedArweaveTxId,
            },
          },
        };
        const expectedState = {
          ...initialState,
          observations: expectedObservationsForEpoch,
        };
        expect(state).toEqual(expectedState);
      });

      it('should append to the list of failure summaries for a gateway if one already exists and a new report is submitted by a prescribed observer', async () => {
        const initialObservationsForEpoch: Observations = {
          [0]: {
            failureSummaries: {
              [stubbedArweaveTxId]: ['observer-address'],
            },
            reports: {
              'observer-address': stubbedArweaveTxId,
            },
          },
        };
        const initialState = {
          ...getBaselineState(),
          gateways: {
            'observer-address': {
              ...stubbedGatewayData,
              observerWallet: 'observer-address',
            },
            'a-second-observer-address': {
              ...stubbedGatewayData,
              observerWallet: 'a-second-observer-address',
            },
            [stubbedArweaveTxId]: {
              ...stubbedGatewayData,
              observerWallet: stubbedArweaveTxId,
            },
          },
          observations: initialObservationsForEpoch,
        };
        const { state } = await saveObservations(initialState, {
          caller: 'a-second-observer-address',
          input: {
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: [stubbedArweaveTxId],
          },
        });
        const expectedObservationsForEpoch: Observations = {
          [0]: {
            failureSummaries: {
              [stubbedArweaveTxId]: [
                'observer-address',
                'a-second-observer-address',
              ],
            },
            reports: {
              'observer-address': stubbedArweaveTxId,
              'a-second-observer-address': stubbedArweaveTxId,
            },
          },
        };
        const expectedState = {
          ...initialState,
          observations: expectedObservationsForEpoch,
        };
        expect(state).toEqual(expectedState);
      });
    });
  });
});
