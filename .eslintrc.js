module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:jest-formatting/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'no-console': 'error',
    'no-debugger': 'error',
    '@typescript-eslint/no-var-requires': 'off',
  },
};
