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
      pattern: '^(?!-)[a-zA-Z0-9-]{1,32}$',
    },
    contractTxId: {
      type: 'string',
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
    years: {
      type: 'integer',
      minimum: 1,
      maximum: 3,
    },
    tierNumber: {
      type: 'integer',
      minimum: 1,
      maximum: 3,
    },
  },
  required: ['name'],
  additionalProperties: false,
};


module.exports = {
  buyRecordSchema
}
