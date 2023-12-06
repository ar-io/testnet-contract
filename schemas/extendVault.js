const extendVaultSchema = {
  $id: '#/definitions/extendVault',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'extendVault',
    },
    index: {
      type: 'number',
      minimum: 0,
    },
    lockLength: {
      type: 'number',
      minimum: 14 * 720, // TO DO - use constant MIN_TOKEN_LOCK_LENGTH
      maximum: 12 * 365 * 720, // TO DO - use constant MAX_TOKEN_LOCK_LENGTH
    },
  },
  required: ['index', 'lockLength'],
  additionalProperties: false,
};

module.exports = {
  extendVaultSchema,
};
