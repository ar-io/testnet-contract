module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  setupFilesAfterEnv: ['./tests/mocks.jest.ts'],
  testMatch: ['**/src/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts/**'],
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
