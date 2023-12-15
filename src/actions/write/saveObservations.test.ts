import {
  INVALID_INPUT_MESSAGE,
  INVALID_OBSERVATION_CALLER_MESSAGE,
  INVALID_OBSERVATION_FOR_GATEWAY_MESSAGE,
  INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
  NETWORK_LEAVING_STATUS,
} from '../../constants';
import { getPrescribedObserversForEpoch } from '../../observers';
import { getBaselineState, stubbedArweaveTxId } from '../../tests/stubs';
import { Gateway, IOState, Observations, WeightedObserver } from '../../types';
import { saveObservations } from './saveObservations';

jest.mock('../../observers', () => ({
  ...jest.requireActual('../../observers'),
  getPrescribedObserversForEpoch: jest.fn(),
}));

export const baselineGatewayData: Gateway = {
  operatorStake: 10_000,
  vaults: {},
  observerWallet: 'fake-observer-wallet',
  start: 0,
  status: 'joined',
  end: 0,
  settings: {
    label: 'test',
    fqdn: 'test.com',
    port: 443,
    protocol: 'https',
  },
};

const stubbedWeightedObservers: WeightedObserver = {
  gatewayAddress: 'observer-address',
  observerAddress: 'observer-address',
  stake: 10_000,
  start: 0,
  stakeWeight: 1,
  tenureWeight: 1,
  gatewayRewardRatioWeight: 1,
  observerRewardRatioWeight: 1,
  compositeWeight: 1,
  normalizedCompositeWeight: 1,
};

describe('saveObservations', () => {
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
            gatewayAddress: stubbedArweaveTxId,
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
            gatewayAddress: stubbedArweaveTxId,
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
            gatewayAddress: stubbedArweaveTxId,
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: ['invalid-fqdn'],
          },
        },
        INVALID_INPUT_MESSAGE,
      ],
      [
        'should throw an error if the gatewayAddress is not a valid tx id',
        {
          ...getBaselineState(),
        },
        {
          caller: 'fake-caller',
          input: {
            gatewayAddress: 'invalid-tx-id',
            observerReportTxId: stubbedArweaveTxId,
            failedGateways: [],
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
    beforeAll(() => {
      // adds two prescribed observers to the mock
      (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([
        stubbedWeightedObservers,
        {
          ...stubbedWeightedObservers,
          gatewayAddress: 'a-second-observer-address',
          observerAddress: 'a-second-observer-address',
        },
      ]);
    });

    afterAll(() => {
      jest.resetAllMocks();
    });

    describe('invalid epoch', () => {
      it('should throw an error if epoch zero has not started', async () => {
        const epochZeroStartHeight = 10;
        const error = await saveObservations(
          {
            ...getBaselineState(),
            distributions: {
              ...getBaselineState().distributions,
              epochZeroStartHeight: 10,
            },
          },
          {
            caller: 'observer-address',
            input: {
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: [],
            },
          },
        ).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          expect.stringContaining(
            `Observations cannot be submitted before block height: ${epochZeroStartHeight}`,
          ),
        );
      });
    });

    describe('invalid caller', () => {
      it.each([
        [
          'should throw an error if the caller is not a registered gateway address or observer address on a registered gateway',
          {
            ...getBaselineState(),
            gateways: {
              [stubbedArweaveTxId]: baselineGatewayData,
            },
          },
          {
            caller: 'fake-caller',
            input: {
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: [],
            },
          },
          INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
        ],
        [
          'should throw an error if the caller is a registered gateway that has not started observing yet',
          {
            ...getBaselineState(),
            gateways: {
              ['observer-address']: {
                ...baselineGatewayData,
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
                ...baselineGatewayData,
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
        [
          'should throw an error if the gatewayAddress is not provided and the caller does not exist in the registry',
          {
            ...getBaselineState(),
          },
          {
            caller: 'fake-caller',
            input: {
              // it should use the caller as the default for gateway address
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: [],
            },
          },
          INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
        ],
        [
          'should throw an error if the gatewayAddress provided is not in the registry',
          {
            ...getBaselineState(),
          },
          {
            caller: 'observer-address',
            input: {
              gatewayAddress: stubbedArweaveTxId,
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: [],
            },
          },
          INVALID_OBSERVER_DOES_NOT_EXIST_MESSAGE,
        ],
        [
          'should throw an error if the gatewayAddress is not provided by the caller does not match the gateway observer address',
          {
            ...getBaselineState(),
            gateways: {
              'observer-address': {
                ...baselineGatewayData,
                observerWallet: 'a-different-address',
              },
            },
          },
          {
            caller: 'observer-address', // this does not match the observer address
            input: {
              observerReportTxId: stubbedArweaveTxId,
              failedGateways: [],
            },
          },
          INVALID_OBSERVATION_FOR_GATEWAY_MESSAGE,
        ],
      ])('%s', async (_, initialState: IOState, inputData, errorMessage) => {
        const error = await saveObservations(initialState, inputData).catch(
          (e) => e,
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(expect.stringContaining(errorMessage));
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
              ...baselineGatewayData,
              observerWallet: 'observer-address',
            },
            [stubbedArweaveTxId]: {
              ...baselineGatewayData,
              observerAddress: stubbedArweaveTxId,
            },
          },
          observations: existingObservations,
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
            ...baselineGatewayData,
            observerWallet: 'observer-address',
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

    it('should not save a gateway to the failure summaries for the epoch if it the observed gateway has not yet started serving', async () => {
      const initialState = {
        ...getBaselineState(),
        gateways: {
          'observer-address': {
            ...baselineGatewayData,
            observerWallet: 'observer-address',
          },
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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
            ...baselineGatewayData,
            observerWallet: 'observer-address',
          },
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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
            ...baselineGatewayData,
            observerWallet: 'observer-address',
          },
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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

    it('should append to the list of failure summaries for a gateway if one already exists and a new report is submitted', async () => {
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
            ...baselineGatewayData,
            observerWallet: 'observer-address',
          },
          'a-second-observer-address': {
            ...baselineGatewayData,
            observerWallet: 'a-second-observer-address',
          },
          [stubbedArweaveTxId]: {
            ...baselineGatewayData,
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
