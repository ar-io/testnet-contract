module.exports = {
  clearMocks: true,
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
