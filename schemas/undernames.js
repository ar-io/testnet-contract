const increaseUndernameCountSchema = {
  $id: '#/definitions/increaseUndernameCount',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'increaseUndernameCount',
    },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    qty: {
      type: 'number',
      minimum: 1,
      maximum: 9990,
    },
  },
  required: ['name', 'qty'],
  additionalProperties: false,
};

module.exports = {
  increaseUndernameCountSchema,
};
