const buyRecordSchema = {
  $id: '#/definitions/buyRecord',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    contractTxId: {
      type: 'string',
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
    years: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
    },
    type: {
      type: 'string',
      pattern: '^(lease|permabuy)$',
    },
    auction: {
      type: 'boolean',
    },
  },
  required: ['name'],
  additionalProperties: true, // allows for auction properties to be provided to buy record
};

module.exports = {
  buyRecordSchema,
};
