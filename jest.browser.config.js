module.exports = {
  clearMocks: true,

  moduleFileExtensions: ['ts', 'js'],

  testPathIgnorePatterns: ['/.yalc/', '/data/', '/_helpers'],

  transform: {
    '^.+\\.(ts)$': 'ts-jest',
  },

  testEnvironment: './browser-jest-env.js',
};
