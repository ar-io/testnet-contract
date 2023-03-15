module.exports = {
  clearMocks: true,
  setupFilesAfterEnv: [
    './tests/setup.jest.ts'
  ],
  moduleFileExtensions: ['ts', 'js'],
  testPathIgnorePatterns: ['/.yalc/', '/data/', '/_helpers'],
  testEnvironment: 'node',
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@assemblyscript/.*)'],
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
