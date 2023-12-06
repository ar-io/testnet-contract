import { handle } from './contract';
import { getBaselineState } from './tests/stubs';

describe('contract', () => {
  beforeAll(() => {
    SmartWeave.transaction.origin = 'L2';
  });

  afterAll(() => {
    SmartWeave.transaction.origin = 'L1';
  });

  it('should reject bundled interactions', async () => {
    const error = await handle(getBaselineState(), {
      input: 'bad-input',
      caller: 'test-caller',
    }).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual('Only L1 transactions are supported.');
  });
});
