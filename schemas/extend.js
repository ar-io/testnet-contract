const extendRecordSchema = {
  $id: '#/definitions/extendRecord',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'extendRecord',
    },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    years: {
      type: 'integer',
      minimum: 1,
      maximum: 5, // should be updated with constants "MAX_YEARS" and "MIN_YEARS"
    },
  },
  required: ['name', 'years'],
  additionalProperties: false,
};

module.exports = {
  extendRecordSchema,
};
