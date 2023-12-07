const extendVaultSchema = {
  $id: '#/definitions/extendVault',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'extendVault',
    },
    id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]{43}$',
    },
    extendLength: {
      type: 'number',
      minimum: 14 * 720, // TO DO - use constant MIN_TOKEN_LOCK_LENGTH
      maximum: 12 * 365 * 720, // TO DO - use constant MAX_TOKEN_LOCK_LENGTH
    },
  },
  required: ['id', 'extendLength'],
  additionalProperties: false,
};

module.exports = {
  extendVaultSchema,
};
