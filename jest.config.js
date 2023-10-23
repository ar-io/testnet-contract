module.exports = {
  clearMocks: true,
  globalSetup: './tests/setup.jest.ts',
  globalTeardown: './tests/teardown.jest.ts',
  setupFilesAfterEnv: ['./tests/mocks.jest.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/**.js',
  ],
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
