module.exports = {
  // clearMocks: true,
  globalSetup: './tests/setup.jest.ts',
  globalTeardown: './tests/teardown.jest.ts',
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
