const transferTokensLockedSchema = {
  $id: '#/definitions/transferTokensLocked',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'vaultedTransfer',
    },
    target: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]{43}$',
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
  required: ['target', 'qty', 'lockLength'],
  additionalProperties: false,
};

module.exports = {
  transferTokensLockedSchema,
};
