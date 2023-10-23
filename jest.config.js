module.exports = {
  clearMocks: true,
  globalSetup: './tests/setup.jest.ts',
  globalTeardown: './tests/teardown.jest.ts',
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/**.mjs',
  ],
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
