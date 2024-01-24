import { getBaselineState } from '../../tests/stubs';
import { baselineGatewayData } from '../write/saveObservations.test';
import { getPrescribedObservers } from './observers';

describe('getPrescribedObservers', () => {
  it('should return the prescribed observers for the current epoch', async () => {
    const state = {
      ...getBaselineState(),
      gateways: {
        'a-test-gateway': baselineGatewayData,
      },
      // no distributions
    };
    const { result } = await getPrescribedObservers(state);
    expect(result).toEqual([
      {
        compositeWeight: 0.00000771604938271605,
        gatewayAddress: 'a-test-gateway',
        gatewayRewardRatioWeight: 1,
        normalizedCompositeWeight: 1,
        observerAddress: 'fake-observer-wallet',
        observerRewardRatioWeight: 1,
        stake: 10000,
        stakeWeight: 1,
        start: 0,
        tenureWeight: 0.00000771604938271605,
      },
    ]);
  });
});
