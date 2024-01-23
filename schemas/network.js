const joinNetworkSchema = {
  $id: '#/definitions/joinNetwork',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'joinNetwork',
    },
    qty: {
      type: 'number',
      minimum: 1,
    },
    fqdn: {
      type: 'string',
      pattern: '^(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+[A-Za-z]{1,63}$', // eslint-disable-line no-useless-escape
    },
    port: {
      type: 'integer',
      minimum: 0,
      maximum: 65535,
    },
    protocol: {
      type: 'string',
      pattern: '^(http|https)$',
    },
    properties: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]{43}$',
    },
    note: {
      type: 'string',
      pattern: '^.{1,256}$', // 1-256 characters
    },
    label: {
      type: 'string',
      pattern: '^.{1,64}$', // 1-64 characters
    },
    observerWallet: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]{43}$',
    },
    allowDelegatedStaking: {
      type: 'boolean',
    },
    delegateRewardShareRatio: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
    },
    reservedDelegates: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-zA-Z0-9-_]{43}$',
        description:
          'The unique list of delegate addresses the that can stake on this gateway',
      },
      uniqueItems: true,
      minItems: 0,
      maxItems: 10_000,
    },
    minDelegatedStake: {
      type: 'integer',
      minimum: 500,
    },
  },
  required: ['qty', 'fqdn', 'port', 'protocol', 'properties', 'note', 'label'],
  additionalProperties: false,
};

module.exports = {
  joinNetworkSchema,
};
