module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  setupFilesAfterEnv: ['./tests/mocks.jest.ts'],
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
