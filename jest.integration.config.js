module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  globalSetup: './tests/setup.jest.ts',
  globalTeardown: './tests/teardown.jest.ts',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: false,
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
