module.exports = {
  // clearMocks: true,
  globalSetup: './tests/setup.jest.ts',
  globalTeardown: './tests/teardown.jest.ts',
  moduleFileExtensions: ['ts', 'js'],
  testPathIgnorePatterns: ['/.yalc/', '/data/', '/_helpers'],
  testEnvironment: 'node',
  testTimeout: 60_000,
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@assemblyscript/.*)'],
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
