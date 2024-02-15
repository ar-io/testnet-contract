const delegateStakeSchema = {
  $id: '#/definitions/delegateStake',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'delegateStake',
    },
    target: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]{43}$',
    },
    qty: {
      type: 'integer',
      minimum: 1,
    },
  },
  required: ['target', 'qty'],
  additionalProperties: false,
};

module.exports = {
  delegateStakeSchema,
};
