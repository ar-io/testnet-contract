import { getPrescribedObserversForEpoch } from '../../observers';
import { getBaselineState } from '../../tests/stubs';
import { baselineGatewayData } from '../write/saveObservations.test';
import { getPrescribedObservers } from './observers';

jest.mock('../../observers', () => ({
  ...jest.requireActual('../../observers'),
  getPrescribedObserversForEpoch: jest.fn().mockResolvedValue([]),
}));

describe('getPrescribedObservers', () => {
  it('should return the prescribed observers for the current epoch', async () => {
    (getPrescribedObserversForEpoch as jest.Mock).mockResolvedValue([]);
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': baselineGatewayData,
      },
      // no distributions
    };
    const { result } = await getPrescribedObservers(state);
    expect(result).toEqual([]);
  });
});
