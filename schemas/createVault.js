const createVaultSchema = {
  $id: '#/definitions/createVault',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'createVault',
    },
    qty: {
      type: 'number',
      minimum: 1,
    },
    lockLength: {
      type: 'number',
      minimum: 14 * 720, // TO DO - use constant MIN_TOKEN_LOCK_LENGTH
      maximum: 12 * 365 * 720, // TO DO - use constant MAX_TOKEN_LOCK_LENGTH
    },
  },
  required: ['qty', 'lockLength'],
  additionalProperties: false,
};

module.exports = {
  createVaultSchema,
};
