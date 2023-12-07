const increaseVaultSchema = {
  $id: '#/definitions/increaseVault',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'increaseVault',
    },
    id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]{43}$',
    },
    qty: {
      type: 'number',
      minimum: 1,
    },
  },
  required: ['id', 'qty'],
  additionalProperties: false,
};

module.exports = {
  increaseVaultSchema,
};
