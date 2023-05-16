const buyRecordSchema = {
  $id: '#/definitions/buyRecord',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'buyRecord',
    },
    name: {
      type: 'string',
      // TODO: add 
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,30}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',

    },
    contractTxId: {
      type: 'string',
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
    years: {
      type: 'integer',
      minimum: 1, // TODO: these validations should pull from state
    },
    tier: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-]{43}$',
    },
  },
  required: ['name', 'function'],
  additionalProperties: false,
};

module.exports = {
  buyRecordSchema,
};
