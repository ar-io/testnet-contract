const decreaseOperatorStakeSchema = {
  $id: '#/definitions/decreaseOperatorStake',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'decreaseOperatorStake',
    },
    qty: {
      type: 'integer',
      minimum: 1,
    },
  },
  required: ['qty'],
  additionalProperties: false,
};

module.exports = {
  decreaseOperatorStakeSchema,
};
