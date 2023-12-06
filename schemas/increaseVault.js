const increaseVaultSchema = {
  $id: '#/definitions/increaseVault',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'increaseVault',
    },
    index: {
      type: 'number',
      minimum: 0,
    },
    qty: {
      type: 'number',
      minimum: 1,
    },
  },
  required: ['index', 'qty'],
  additionalProperties: false,
};

module.exports = {
  increaseVaultSchema,
};
