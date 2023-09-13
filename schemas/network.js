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
      minimum: 1
    },
    fqdn: {
      type: 'string',
      pattern: '^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+(?!-)[A-Za-z0-9-]{1,63}(?<!-)$' // eslint-disable-line no-useless-escape
    },
    port: {
        type: 'number',
        minimum: 0,
        maximum: 65535
    },
    protocol: {
        type: 'string',
        pattern: 'http|https'
    },
    properties: {
        type: 'string',
        pattern: '^[a-zA-Z0-9_-]{43}$'
    },
    note: {
        type: 'string',
        pattern: '^.{1,256}$' // 1-256 characters
    },
    label: {
        type: 'string',
        pattern: '^.{1,64}$' // 1-64 characters
    }
  },
  required: ['function', 'qty', 'fqdn', 'port', 'protocol', 'properties', 'note', 'label'],
  additionalProperties: false,
};

module.exports = {
  joinNetworkSchema,
};
