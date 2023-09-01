const commonDefinitions = {
  $id: '#/definitions/common',
  $defs: {
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    contractTxId: {
      type: 'string',
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
    target: {
      type: 'string',
      pattern: '^([a-zA-Z0-9-_]{43})$',
    },
    years: {
      type: 'integer',
      minimum: 1,
      maximum: 5, // should be updated with constants "MAX_YEARS" and "MIN_YEARS"
    },
    type: {
      type: 'string',
      pattern: '^(lease|permabuy)$',
    },
  },
};

module.exports = { commonDefinitions };
