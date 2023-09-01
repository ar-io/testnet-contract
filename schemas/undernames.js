const increaseUndernameCountSchema = {
  $id: '#/definitions/increaseUndernameCount',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'increaseUndernameCount',
    },
    name: { $ref: 'common#/$defs/name' },
    qty: {
      type: 'number',
      minimum: 1,
      maximum: 9990, // should be updated with contants "DEFAULT_UNDERNAME_COUNT" and "MAX_ALLOWED_UNDERNAMES"
    },
  },
  required: ['name', 'qty'],
  additionalProperties: false,
};

module.exports = {
  increaseUndernameCountSchema,
};
